import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

import type { OutboxOp, Row } from './outbox';
import { syncTables } from './registry';
import { onEnqueue, useOutbox } from './store';

let flushing = false;
let timer: ReturnType<typeof setTimeout> | null = null;

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Надсилає чергу змін. Без акаунта або без мережі нічого не втрачається — черга чекає. */
export async function flushOutbox(): Promise<void> {
  if (!supabase || flushing) return;
  const userId = await currentUserId();
  if (!userId) return;
  flushing = true;
  try {
    const queue = useOutbox.getState().queue;
    for (const config of syncTables()) {
      const ops = queue.filter((op) => op.table === config.table);
      if (!ops.length) continue;
      const rows: Row[] = ops.map((op) => ({ ...op.row, [config.owner]: userId }));
      const error = config.push
        ? await config.push(supabase, rows)
        : ((
            await supabase
              .from(config.table)
              .upsert(rows, config.onConflict ? { onConflict: config.onConflict } : undefined)
          ).error?.message ?? null);
      if (error) {
        console.warn(`[sync] ${config.table}: ${error}`);
        break; // зберігаємо порядок: дочірні таблиці не відправляємо без батьківських
      }
      useOutbox.getState().markSent(ops);
    }
  } finally {
    flushing = false;
  }
}

/** Завантажує з сервера записи, змінені з часу останньої синхронізації. */
export async function pullRemote(): Promise<void> {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  for (const config of syncTables()) {
    const since = useOutbox.getState().pulledUntil[config.table];
    let query = supabase
      .from(config.table)
      .select(config.select ?? '*')
      .eq(config.owner, userId);
    if (since) query = query.gt('updated_at', since);
    const { data, error } = await query.order('updated_at', { ascending: true }).limit(1000);
    if (error) {
      console.warn(`[sync] pull ${config.table}: ${error.message}`);
      continue;
    }
    const rows = (data ?? []) as unknown as Row[];
    // Не перезаписуємо записи, які ще чекають відправки — локальна версія новіша.
    const pending = new Set(
      useOutbox
        .getState()
        .queue.filter((op: OutboxOp) => op.table === config.table)
        .map((op) => op.id),
    );
    const fresh = rows.filter((r) => !pending.has(String(r.id)));
    if (fresh.length) config.applyRemote(fresh);
    const last = rows.at(-1)?.updated_at;
    if (typeof last === 'string') useOutbox.getState().setPulledUntil(config.table, last);
  }
}

export async function syncNow(): Promise<void> {
  await flushOutbox();
  await pullRemote();
}

function scheduleFlush() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flushOutbox(), 1500);
}

let started = false;

/** Запускає синхронізацію: після запису, при поверненні в застосунок і при вході. */
export function startSyncEngine(): () => void {
  if (started || !supabase) return () => {};
  started = true;
  onEnqueue(scheduleFlush);
  const appState = AppState.addEventListener('change', (s) => {
    if (s === 'active') void syncNow();
  });
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') void syncNow();
  });
  return () => {
    started = false;
    appState.remove();
    data.subscription.unsubscribe();
  };
}
