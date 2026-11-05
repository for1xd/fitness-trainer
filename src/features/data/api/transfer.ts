import type { PersistOptions } from 'zustand/middleware';

import { useGym } from '@/features/gym/store';
import { useNutrition } from '@/features/nutrition/store';
import { useOnboarding } from '@/features/onboarding/store';
import { useProfile } from '@/features/profile/store';
import { useProgress } from '@/features/progress/store';
import { useReminders } from '@/features/reminders/store';
import { useSettings } from '@/features/settings/store';
import { useStrength } from '@/features/strength/store';
import { useWater } from '@/features/water/store';
import { useWorkouts } from '@/features/workouts/store';
import { flushAll } from '@/lib/cloud/storage';
import { useOutbox } from '@/lib/sync/store';

import { isValidStoreState } from '../logic/validateState';

import {
  buildEnvelope,
  EXPORTED_STORES,
  parseEnvelope,
  type ExportedStore,
  type ImportError,
} from '../logic/envelope';

interface PersistedHook {
  getState(): object;
  setState(partial: object): void;
  getInitialState(): object;
  persist: {
    getOptions(): Partial<PersistOptions<object, unknown>>;
    clearStorage(): void;
  };
}

const asHook = (h: unknown) => h as PersistedHook;

const STORES: Record<ExportedStore, PersistedHook> = {
  profile: asHook(useProfile),
  settings: asHook(useSettings),
  nutrition: asHook(useNutrition),
  water: asHook(useWater),
  strength: asHook(useStrength),
  gym: asHook(useGym),
  workouts: asHook(useWorkouts),
  progress: asHook(useProgress),
  reminders: asHook(useReminders),
};

/** Службові сховища: очищаються при скиданні, але не експортуються. */
const SERVICE_STORES: PersistedHook[] = [asHook(useOutbox), asHook(useOnboarding)];

/** Лише дані (без функцій) — те, що persist записує на диск. */
function persistedState(hook: PersistedHook): Record<string, unknown> {
  const state = hook.getState();
  const partialize = hook.persist.getOptions().partialize;
  const picked = (partialize ? partialize(state) : state) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(picked).filter(([, v]) => typeof v !== 'function'));
}

export function exportJson(): string {
  const stores = Object.fromEntries(EXPORTED_STORES.map((n) => [n, persistedState(STORES[n])]));
  return JSON.stringify(buildEnvelope(stores));
}

export async function importJson(
  text: string,
): Promise<{ ok: true } | { ok: false; error: ImportError }> {
  const parsed = parseEnvelope(text);
  if (!parsed.ok) return parsed;
  // Спершу перевіряємо всі розділи — файл або приймається повністю, або не змінює нічого
  for (const name of EXPORTED_STORES) {
    const state = parsed.stores[name];
    const initial = STORES[name].getInitialState() as Record<string, unknown>;
    if (state && !isValidStoreState(state, initial)) return { ok: false, error: 'wrongFormat' };
  }
  for (const name of EXPORTED_STORES) {
    const state = parsed.stores[name];
    if (!state) continue;
    // Повна заміна: початковий стан + поля з файлу (уже перевірені)
    const hook = STORES[name];
    hook.setState({ ...(hook.getInitialState() as Record<string, unknown>), ...state });
  }
  await flushAll();
  return { ok: true };
}

/** Видаляє всі дані користувача: на пристрої і в особистому розділі бази. */
export async function resetAll() {
  for (const hook of [...Object.values(STORES), ...SERVICE_STORES]) {
    hook.setState(hook.getInitialState());
    hook.persist.clearStorage();
  }
  await flushAll();
}

export const exportFileName = (date = new Date()) =>
  `fitness-trainer-${date.toISOString().slice(0, 10)}.json`;
