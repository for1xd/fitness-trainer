import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, versioned } from '@/lib/persistStorage';
import type { Row } from '@/lib/sync/outbox';
import { registerSyncTable } from '@/lib/sync/registry';
import { queueRow } from '@/lib/sync/store';

import {
  updateOneRmFromSet,
  type ExperienceLevel,
  type LoggedSet,
  type OneRmEstimate,
} from './logic/oneRm';

export interface StoredEstimate extends OneRmEstimate {
  id: string;
  exerciseId: string;
  measuredAt: string;
}

interface StrengthState {
  experience: ExperienceLevel | null;
  /** Остання оцінка 1ПМ для кожної вправи */
  estimates: Record<string, StoredEstimate>;
  /** Історія оцінок — для графіка прогресу 1ПМ */
  history: { exerciseId: string; oneRmKg: number; date: string }[];
  saveCalibration: (level: ExperienceLevel, estimates: Record<string, OneRmEstimate>) => void;
  /** Оновлює 1ПМ з виконаних підходів; повертає вправи, де 1ПМ зріс. */
  applySets: (sets: (LoggedSet & { exerciseId: string })[]) => string[];
  applyRemote: (rows: Row[]) => void;
  reset: () => void;
}

const toRow = (e: StoredEstimate): Row & { id: string } => ({
  id: e.id,
  exercise_id: e.exerciseId,
  one_rm_kg: e.oneRmKg,
  method: e.method,
  confidence: e.confidence,
  measured_at: e.measuredAt,
  updated_at: e.measuredAt,
});

export const useStrength = create<StrengthState>()(
  persist(
    (set, get) => {
      const store = (exerciseId: string, est: OneRmEstimate) => {
        const measuredAt = new Date().toISOString();
        const stored: StoredEstimate = { ...est, id: randomUUID(), exerciseId, measuredAt };
        set((s) => ({
          estimates: { ...s.estimates, [exerciseId]: stored },
          history: [
            ...s.history,
            { exerciseId, oneRmKg: est.oneRmKg, date: measuredAt.slice(0, 10) },
          ],
        }));
        queueRow('strength_estimates', toRow(stored));
      };

      return {
        experience: null,
        estimates: {},
        history: [],

        saveCalibration: (level, estimates) => {
          set({ experience: level });
          for (const [exerciseId, est] of Object.entries(estimates)) store(exerciseId, est);
        },

        applySets: (sets) => {
          const improved: string[] = [];
          for (const s of sets) {
            if (s.weightKg <= 0) continue;
            const current = get().estimates[s.exerciseId] ?? null;
            const next = updateOneRmFromSet(current, s);
            if (next && next !== current && next.oneRmKg !== current?.oneRmKg) {
              store(s.exerciseId, next);
              improved.push(s.exerciseId);
            }
          }
          return [...new Set(improved)];
        },

        applyRemote: (rows) =>
          set((s) => {
            const estimates = { ...s.estimates };
            for (const r of rows) {
              const remote: StoredEstimate = {
                id: String(r.id),
                exerciseId: String(r.exercise_id),
                oneRmKg: Number(r.one_rm_kg),
                method: r.method as StoredEstimate['method'],
                confidence: r.confidence as StoredEstimate['confidence'],
                measuredAt: String(r.measured_at),
              };
              const local = estimates[remote.exerciseId];
              if (!local || remote.measuredAt > local.measuredAt)
                estimates[remote.exerciseId] = remote;
            }
            return { estimates };
          }),

        reset: () => set({ experience: null, estimates: {}, history: [] }),
      };
    },
    { name: 'strength', storage: persistStorage, ...versioned('strength') },
  ),
);

registerSyncTable({
  table: 'strength_estimates',
  order: 40,
  owner: 'user_id',
  applyRemote: (rows) => useStrength.getState().applyRemote(rows),
});
