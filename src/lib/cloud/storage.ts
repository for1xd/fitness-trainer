import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { StateStorage } from 'zustand/middleware';

import { getArtifactDb, getArtifactUser, isArtifactHost, type ArtifactDb } from '../artifactHost';
import { SCHEMA_VERSION } from '../dataSchema';
import { blobRefs, extractBlobs, restoreBlobs, splitChunks } from './codec';

/**
 * Сховище для zustand persist.
 * - Усередині артефакта claude.ai: особистий розділ користувача в базі артефакта
 *   (`data/users/<id>/…` — його не бачить ніхто інший, навіть власник артефакта).
 *   Так дані доступні з будь-якого пристрою під тим самим акаунтом.
 * - localStorage / AsyncStorage — швидкий кеш і запасний варіант, коли бази немає.
 * Запис у базу — із затримкою 500 мс (кілька змін поспіль = один запис).
 */

export type CloudMode = 'pending' | 'account' | 'readonly' | 'device';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatus {
  cloud: CloudMode;
  state: SaveState;
  savedAt: number | null;
}

export const useSaveStatus = create<SaveStatus>(() => ({
  cloud: isArtifactHost() ? 'pending' : 'device',
  state: 'idle',
  savedAt: null,
}));

const DEBOUNCE_MS = 500;
const CLOUD_TIMEOUT_MS = 8000;

/* ---------- Локальний кеш: кожна операція в try/catch ---------- */

const local = {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Кеш недоступний (приватний режим, переповнення) — працюємо далі з пам'яті й бази
    }
  },
  async remove(key: string) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // див. вище
    }
  },
};

/** Час останньої зміни на цьому пристрої — щоб свіжіша локальна копія не програла старішій у базі. */
const atKey = (name: string) => `${name}@at`;
async function localAt(name: string): Promise<number> {
  const v = await local.get(atKey(name));
  return v ? Number(v) || 0 : 0;
}

/* ---------- База артефакта ---------- */

interface Cloud {
  db: ArtifactDb;
  base: string;
  canWrite: boolean;
}

let cloudPromise: Promise<Cloud | null> | null = null;

function getCloud(): Promise<Cloud | null> {
  cloudPromise ??= (async () => {
    if (!isArtifactHost()) return null;
    const connect = (async (): Promise<Cloud | null> => {
      const [db, user] = await Promise.all([getArtifactDb(), getArtifactUser()]);
      if (!db || !user) return null;
      const id = await user.id();
      if (!id) return null;
      const canWrite = (await user.can('data.write')) !== false;
      return { db, base: `data/users/${id}`, canWrite };
    })().catch(() => null);
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), CLOUD_TIMEOUT_MS),
    );
    const cloud = await Promise.race([connect, timeout]);
    useSaveStatus.setState({ cloud: cloud ? (cloud.canWrite ? 'account' : 'readonly') : 'device' });
    return cloud;
  })();
  return cloudPromise;
}

const storeDoc = (name: string) => `s_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
const blobDoc = (hash: string) => `b_${hash}`;

/** Скільки частин має кожен документ — щоб прибрати зайві після скорочення. */
const chunkCounts = new Map<string, number>();

async function readDoc(c: Cloud, id: string): Promise<{ text: string; at: number } | null> {
  const main = await c.db.doc(`${c.base}/${id}`).get();
  if (!main.exists) return null;
  const d = main.data() ?? {};
  const first = typeof d.t === 'string' ? d.t : '';
  const n = typeof d.n === 'number' && d.n > 1 ? Math.min(d.n, 500) : 1;
  const at = typeof d.at === 'number' ? d.at : 0;
  chunkCounts.set(id, n);
  if (n === 1) return { text: first, at };
  const rest = await Promise.all(
    Array.from({ length: n - 1 }, (_, i) => c.db.doc(`${c.base}/${id}_${i + 1}`).get()),
  );
  const tail = rest.map((s) => {
    const t = s.data()?.t;
    return typeof t === 'string' ? t : '';
  });
  return { text: first + tail.join(''), at };
}

const readText = async (c: Cloud, id: string) => (await readDoc(c, id))?.text ?? null;

async function writeText(c: Cloud, id: string, text: string, at = Date.now()) {
  const parts = splitChunks(text);
  // Спершу продовження, потім головний документ: читач не побачить «половину» нового запису
  for (let i = 1; i < parts.length; i++)
    await c.db.doc(`${c.base}/${id}_${i}`).set({ t: parts[i] });
  await c.db.doc(`${c.base}/${id}`).set({
    t: parts[0] ?? '',
    n: parts.length,
    v: SCHEMA_VERSION,
    at,
  });
  const before = chunkCounts.get(id) ?? 1;
  for (let i = parts.length; i < before; i++) await c.db.doc(`${c.base}/${id}_${i}`).delete();
  chunkCounts.set(id, parts.length);
}

async function deleteText(c: Cloud, id: string) {
  const n = chunkCounts.get(id) ?? 1;
  await c.db.doc(`${c.base}/${id}`).delete();
  for (let i = 1; i < n; i++) await c.db.doc(`${c.base}/${id}_${i}`).delete();
  chunkCounts.delete(id);
}

/* ---------- Фото: окремі записи, спільні для всіх сховищ ---------- */

const blobCache = new Map<string, string>();
const blobsInCloud = new Set<string>();
const refsByStore = new Map<string, Set<string>>();

async function loadBlobs(c: Cloud, refs: Set<string>) {
  await Promise.all(
    [...refs]
      .filter((h) => !blobCache.has(h))
      .map(async (h) => {
        const uri = await readText(c, blobDoc(h));
        if (uri !== null) {
          blobCache.set(h, uri);
          blobsInCloud.add(h);
        }
      }),
  );
}

/** Видаляє фото, на які вже не посилається жодне сховище. */
async function collectGarbage(c: Cloud, candidates: Iterable<string>) {
  for (const h of candidates) {
    const used = [...refsByStore.values()].some((refs) => refs.has(h));
    if (used || !blobsInCloud.has(h)) continue;
    await deleteText(c, blobDoc(h));
    blobsInCloud.delete(h);
    blobCache.delete(h);
  }
}

/* ---------- Черга записів: один запис за раз ---------- */

let queue: Promise<void> = Promise.resolve();
let inFlight = 0;
const pending = new Map<string, { value: string; at: number }>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function enqueue(task: (c: Cloud) => Promise<void>) {
  inFlight++;
  queue = queue
    .then(async () => {
      const c = await getCloud();
      if (!c?.canWrite) return;
      await task(c);
    })
    .then(
      () => {
        inFlight--;
        if (inFlight === 0 && pending.size === 0)
          useSaveStatus.setState({ state: 'saved', savedAt: Date.now() });
      },
      (e: unknown) => {
        inFlight--;
        console.warn('[cloud] save failed:', e);
        useSaveStatus.setState({ state: 'error' });
      },
    );
}

function flush(name: string) {
  const t = timers.get(name);
  if (t) clearTimeout(t);
  timers.delete(name);
  const item = pending.get(name);
  pending.delete(name);
  if (item === undefined) return;
  const { value, at } = item;
  if (!isArtifactHost()) {
    useSaveStatus.setState({ state: 'saved', savedAt: Date.now() });
    return;
  }
  enqueue(async (c) => {
    const { json, blobs } = extractBlobs(value);
    for (const [h, uri] of blobs) {
      blobCache.set(h, uri);
      if (blobsInCloud.has(h)) continue;
      await writeText(c, blobDoc(h), uri);
      blobsInCloud.add(h);
    }
    await writeText(c, storeDoc(name), json, at);
    const previous = refsByStore.get(name) ?? new Set<string>();
    refsByStore.set(name, blobRefs(json));
    await collectGarbage(c, previous);
  });
}

function schedule(name: string, value: string, at = Date.now()) {
  pending.set(name, { value, at });
  useSaveStatus.setState({ state: 'saving' });
  const t = timers.get(name);
  if (t) clearTimeout(t);
  timers.set(
    name,
    setTimeout(() => flush(name), DEBOUNCE_MS),
  );
}

/** Записати все відкладене негайно (закриття вкладки, імпорт, скидання). */
export function flushAll(): Promise<void> {
  for (const name of [...pending.keys()]) flush(name);
  return queue;
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', () => void flushAll());
  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flushAll();
    });
}

/* ---------- Інтерфейс для zustand persist ---------- */

export const hybridStorage: StateStorage = {
  async getItem(name) {
    const cloud = await getCloud();
    if (cloud) {
      try {
        const doc = await readDoc(cloud, storeDoc(name));
        const cached = await local.get(name);
        const cachedAt = await localAt(name);
        // Локальна копія новіша (напр. вкладку закрили до відправки) — вона й іде в базу
        if (cached !== null && (doc === null || cachedAt > doc.at)) {
          if (cloud.canWrite) schedule(name, cached, cachedAt || Date.now());
          if (doc) refsByStore.set(name, blobRefs(doc.text));
          return cached;
        }
        if (doc) {
          const refs = blobRefs(doc.text);
          refsByStore.set(name, refs);
          await loadBlobs(cloud, refs);
          const value = restoreBlobs(doc.text, blobCache);
          await local.set(name, value);
          await local.set(atKey(name), String(doc.at));
          return value;
        }
        return null;
      } catch (e) {
        console.warn('[cloud] read failed, using local cache:', e);
      }
    }
    return local.get(name);
  },
  async setItem(name, value) {
    // Спершу в чергу (синхронно) — тоді flushAll() одразу після зміни стану її побачить
    const at = Date.now();
    schedule(name, value, at);
    await local.set(name, value);
    await local.set(atKey(name), String(at));
  },
  async removeItem(name) {
    pending.delete(name);
    const t = timers.get(name);
    if (t) clearTimeout(t);
    timers.delete(name);
    if (isArtifactHost())
      enqueue(async (c) => {
        await deleteText(c, storeDoc(name));
        const previous = refsByStore.get(name) ?? new Set<string>();
        refsByStore.delete(name);
        await collectGarbage(c, previous);
      });
    await local.remove(name);
    await local.remove(atKey(name));
  },
};
