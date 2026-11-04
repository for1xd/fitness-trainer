import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { todayIso } from '@/lib/dates';
import { persistStorage } from '@/lib/persistStorage';

import { pushProfileToCloud } from './api/sync';
import { buildTargets, trendWeightForRecalc, upsertWeight } from './logic/buildTargets';
import type { Profile, TargetsRecord, WeightRecord } from './types';

interface ProfileState {
  profile: Profile | null;
  weights: WeightRecord[];
  targets: TargetsRecord | null;
  /** Зберігає відповіді онбордингу (або їх редагування) і перераховує норми. */
  saveProfile: (profile: Profile, weightKg: number, isEdit: boolean) => TargetsRecord;
  /** Записує вагу. Якщо тренд відійшов на ≥1 кг — повертає нові норми. */
  logWeight: (weightKg: number, date?: string) => { updatedTargets: TargetsRecord | null };
  reset: () => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => {
      const sync = () => void pushProfileToCloud(get());

      return {
        profile: null,
        weights: [],
        targets: null,

        saveProfile: (profile, weightKg, isEdit) => {
          const date = todayIso();
          const weights = upsertWeight(get().weights, { id: randomUUID(), date, weightKg });
          const targets = buildTargets(profile, weightKg, isEdit ? 'manual' : 'onboarding', {
            id: randomUUID(),
            validFrom: date,
          });
          set({ profile, weights, targets });
          sync();
          return targets;
        },

        logWeight: (weightKg, date = todayIso()) => {
          const existing = get().weights.find((w) => w.date === date);
          const weights = upsertWeight(get().weights, {
            id: existing?.id ?? randomUUID(),
            date,
            weightKg,
          });
          const { profile, targets } = get();
          const trend = trendWeightForRecalc(weights, targets);
          const updatedTargets =
            profile && trend !== null
              ? buildTargets(profile, trend, 'weight_change', { id: randomUUID(), validFrom: date })
              : null;
          set({ weights, ...(updatedTargets ? { targets: updatedTargets } : {}) });
          sync();
          return { updatedTargets };
        },

        reset: () => set({ profile: null, weights: [], targets: null }),
      };
    },
    {
      name: 'profile',
      storage: persistStorage,
      partialize: (s) => ({ profile: s.profile, weights: s.weights, targets: s.targets }),
    },
  ),
);

export const latestWeightKg = (weights: WeightRecord[]) => weights.at(-1)?.weightKg;
