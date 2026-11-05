import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, versioned } from '@/lib/persistStorage';

import type { ActivityLevel, Goal, Pace, Sex } from './logic/nutrition';

export interface OnboardingDraft {
  sex?: Sex;
  ageYears?: number;
  heightCm?: number;
  weightKg?: number;
  activity?: ActivityLevel;
  goal?: Goal;
  pace: Pace;
}

interface OnboardingState {
  draft: OnboardingDraft;
  step: number;
  update: (patch: Partial<OnboardingDraft>) => void;
  setStep: (step: number) => void;
  load: (draft: OnboardingDraft) => void;
  clear: () => void;
}

const empty: OnboardingDraft = { pace: 'normal' };

/** Чернетка зберігається між запусками, щоб не вводити все заново. */
export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      draft: empty,
      step: 0,
      update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      setStep: (step) => set({ step }),
      load: (draft) => set({ draft, step: 0 }),
      clear: () => set({ draft: empty, step: 0 }),
    }),
    { name: 'onboarding-draft', storage: persistStorage, ...versioned('onboarding-draft') },
  ),
);

export type CompleteDraft = Required<OnboardingDraft>;

export function isComplete(d: OnboardingDraft): d is CompleteDraft {
  return (
    d.sex !== undefined &&
    d.ageYears !== undefined &&
    d.heightCm !== undefined &&
    d.weightKg !== undefined &&
    d.activity !== undefined &&
    d.goal !== undefined
  );
}

export const LIMITS = {
  ageYears: { min: 14, max: 90, step: 1 },
  heightCm: { min: 120, max: 230, step: 1 },
  weightKg: { min: 35, max: 250, step: 0.5 },
} as const;
