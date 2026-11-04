import { calcAgeYears } from '@/features/onboarding/logic/nutrition';
import type { Profile } from '@/features/profile/types';
import { parseIsoDate } from '@/lib/dates';

import type { OnboardingDraft } from './store';

export function draftFromProfile(profile: Profile, weightKg: number | undefined): OnboardingDraft {
  return {
    sex: profile.sex,
    ageYears: calcAgeYears(parseIsoDate(profile.birthDate)),
    heightCm: profile.heightCm,
    weightKg,
    activity: profile.activity,
    goal: profile.goal,
    pace: profile.pace,
  };
}
