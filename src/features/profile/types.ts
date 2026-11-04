import type {
  ActivityLevel,
  Goal,
  NutritionTargets,
  Pace,
  Sex,
} from '@/features/onboarding/logic/nutrition';

export interface Profile {
  sex: Sex;
  /** YYYY-MM-DD */
  birthDate: string;
  heightCm: number;
  activity: ActivityLevel;
  goal: Goal;
  pace: Pace;
}

export interface WeightRecord {
  id: string;
  date: string;
  weightKg: number;
}

export type TargetsReason = 'onboarding' | 'weight_change' | 'manual';

export interface TargetsRecord extends NutritionTargets {
  id: string;
  validFrom: string;
  /** Вага, від якої рахувались норми (для автоперерахунку). */
  weightKg: number;
  waterMl: number;
  reason: TargetsReason;
}
