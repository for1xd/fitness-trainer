import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { mergeLww, type Row } from '@/lib/sync/outbox';
import { queueRow } from '@/lib/sync/store';
import { persistStorage, versioned } from '@/lib/persistStorage';

import { lastEntryOfDay, MAX_SINGLE_ML, type WaterEntry } from './logic/waterDay';

interface WaterState {
  entries: WaterEntry[];
  /** Дні, позначені як тренувальні (+500 мл до норми). На етапі 3 — з календаря тренувань. */
  trainingDays: string[];
  add: (ml: number, date: string) => void;
  undoLast: (date: string) => void;
  setTrainingDay: (date: string, isTraining: boolean) => void;
  applyRemote: (entries: WaterEntry[], deletedIds: string[]) => void;
  reset: () => void;
}

export const waterToRow = (e: WaterEntry, deletedAt?: string): Row & { id: string } => ({
  id: e.id,
  date: e.date,
  at: e.at,
  ml: e.ml,
  updated_at: e.updatedAt,
  deleted_at: deletedAt ?? null,
});

export const waterFromRow = (r: Row): WaterEntry => ({
  id: String(r.id),
  date: String(r.date),
  at: String(r.at),
  ml: Number(r.ml),
  updatedAt: String(r.updated_at),
});

export const useWater = create<WaterState>()(
  persist(
    (set, get) => ({
      entries: [],
      trainingDays: [],
      add: (ml, date) => {
        const amount = Math.round(Math.min(MAX_SINGLE_ML, Math.max(1, ml)));
        const at = new Date().toISOString();
        const entry: WaterEntry = { id: randomUUID(), date, at, ml: amount, updatedAt: at };
        set((s) => ({ entries: [...s.entries, entry] }));
        queueRow('water_entries', waterToRow(entry));
      },
      undoLast: (date) => {
        const last = lastEntryOfDay(get().entries, date);
        if (!last) return;
        set((s) => ({ entries: s.entries.filter((e) => e.id !== last.id) }));
        const stamp = new Date().toISOString();
        queueRow('water_entries', waterToRow({ ...last, updatedAt: stamp }, stamp));
      },
      setTrainingDay: (date, isTraining) =>
        set((s) => ({
          trainingDays: isTraining
            ? [...new Set([...s.trainingDays, date])]
            : s.trainingDays.filter((d) => d !== date),
        })),
      applyRemote: (entries, deletedIds) =>
        set((s) => ({ entries: mergeLww(s.entries, entries, deletedIds) })),
      reset: () => set({ entries: [], trainingDays: [] }),
    }),
    { name: 'water', storage: persistStorage,
      ...versioned('water') },
  ),
);
