import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { todayIso } from '@/lib/dates';
import { persistStorage, versioned } from '@/lib/persistStorage';
import { mergeLww } from '@/lib/sync/outbox';
import { queueRow } from '@/lib/sync/store';

import { profileToRow, registerProfileSync, targetsToRow, weightToRow } from './api/sync';
import { buildTargets, trendWeightForRecalc, upsertWeight } from './logic/buildTargets';
import type { Profile, TargetsRecord, WeightRecord } from './types';

interface ProfileState {
  profile: Profile | null;
  profileUpdatedAt: string | null;
  weights: WeightRecord[];
  targets: TargetsRecord | null;
  /** Зберігає відповіді онбордингу (або їх редагування) і перераховує норми. */
  saveProfile: (profile: Profile, weightKg: number, isEdit: boolean) => TargetsRecord;
  /** Записує вагу. Якщо тренд відійшов на ≥1 кг — повертає нові норми. */
  logWeight: (weightKg: number, date?: string) => { updatedTargets: TargetsRecord | null };
  reset: () => void;
}

const now = () => new Date().toISOString();

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      profileUpdatedAt: null,
      weights: [],
      targets: null,

      saveProfile: (profile, weightKg, isEdit) => {
        const date = todayIso();
        const stamp = now();
        const existing = get().weights.find((w) => w.date === date);
        const weight: WeightRecord = {
          id: existing?.id ?? randomUUID(),
          date,
          weightKg,
          updatedAt: stamp,
        };
        const targets = {
          ...buildTargets(profile, weightKg, isEdit ? 'manual' : 'onboarding', {
            id: randomUUID(),
            validFrom: date,
          }),
          updatedAt: stamp,
        };
        set({
          profile,
          profileUpdatedAt: stamp,
          weights: upsertWeight(get().weights, weight),
          targets,
        });
        queueRow('profiles', profileToRow(profile, stamp));
        queueRow('weight_entries', weightToRow(weight));
        queueRow('nutrition_targets', targetsToRow(targets));
        return targets;
      },

      logWeight: (weightKg, date = todayIso()) => {
        const existing = get().weights.find((w) => w.date === date);
        const weight: WeightRecord = {
          id: existing?.id ?? randomUUID(),
          date,
          weightKg,
          updatedAt: now(),
        };
        const weights = upsertWeight(get().weights, weight);
        const { profile, targets } = get();
        const trend = trendWeightForRecalc(weights, targets);
        const updatedTargets =
          profile && trend !== null
            ? {
                ...buildTargets(profile, trend, 'weight_change', {
                  id: randomUUID(),
                  validFrom: date,
                }),
                updatedAt: now(),
              }
            : null;
        set({ weights, ...(updatedTargets ? { targets: updatedTargets } : {}) });
        queueRow('weight_entries', weightToRow(weight));
        if (updatedTargets) queueRow('nutrition_targets', targetsToRow(updatedTargets));
        return { updatedTargets };
      },

      reset: () => set({ profile: null, profileUpdatedAt: null, weights: [], targets: null }),
    }),
    {
      name: 'profile',
      storage: persistStorage,
      ...versioned('profile'),
      partialize: (s) => ({
        profile: s.profile,
        profileUpdatedAt: s.profileUpdatedAt,
        weights: s.weights,
        targets: s.targets,
      }),
    },
  ),
);

/** Норми однозначно виводяться з профілю й ваги: якщо їх ще немає (новий пристрій) — рахуємо. */
function ensureTargets() {
  const { profile, weights, targets } = useProfile.getState();
  const lastWeight = weights.at(-1);
  if (!profile || !lastWeight || targets) return;
  useProfile.setState({
    targets: {
      ...buildTargets(profile, lastWeight.weightKg, 'manual', {
        id: randomUUID(),
        validFrom: todayIso(),
      }),
      updatedAt: now(),
    },
  });
}

// Дані з сервера (інший пристрій): профіль — якщо новіший, вага — злиттям.
registerProfileSync({
  profile: (remote, updatedAt) => {
    const { profileUpdatedAt } = useProfile.getState();
    if (!profileUpdatedAt || updatedAt > profileUpdatedAt) {
      useProfile.setState({ profile: remote, profileUpdatedAt: updatedAt });
    }
    ensureTargets();
  },
  weights: (remote) => {
    useProfile.setState((s) => ({
      weights: mergeLww(s.weights, remote).sort((a, b) => a.date.localeCompare(b.date)),
    }));
    ensureTargets();
  },
  targets: ensureTargets,
});

export const latestWeightKg = (weights: WeightRecord[]) => weights.at(-1)?.weightKg;
