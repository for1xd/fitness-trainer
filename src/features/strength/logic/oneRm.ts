import type { Sex } from '@/features/onboarding/logic/nutrition';

export type OneRmMethod = 'epley' | 'brzycki' | 'level';
export type Confidence = 'high' | 'medium' | 'low';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type BaseLift = 'squat' | 'bench' | 'deadlift' | 'ohp' | 'row' | 'pullup';

export interface OneRmEstimate {
  oneRmKg: number;
  method: OneRmMethod;
  confidence: Confidence;
}

export const MAX_REPS_FOR_ESTIMATE = 15;

/** Еплі: 1ПМ = вага × (1 + повт / 30). */
export const epley = (weightKg: number, reps: number) =>
  reps === 1 ? weightKg : weightKg * (1 + reps / 30);

/** Бжицкі: 1ПМ = вага × 36 / (37 − повт). Точніша для більшої кількості повторень. */
export const brzycki = (weightKg: number, reps: number) => (weightKg * 36) / (37 - reps);

const roundHalf = (kg: number) => Math.round(kg * 2) / 2;

/**
 * Оцінка 1ПМ з підходу до відмови. До 10 повторень — Еплі, 11–15 — Бжицкі.
 * Понад 15 повторень оцінка ненадійна, тож повертаємо null.
 */
export function estimateOneRm(weightKg: number, reps: number): OneRmEstimate | null {
  if (!(weightKg > 0) || !Number.isInteger(reps) || reps < 1 || reps > MAX_REPS_FOR_ESTIMATE) {
    return null;
  }
  const method: OneRmMethod = reps <= 10 ? 'epley' : 'brzycki';
  const raw = method === 'epley' ? epley(weightKg, reps) : brzycki(weightKg, reps);
  const confidence: Confidence = reps <= 5 ? 'high' : reps <= 10 ? 'medium' : 'low';
  return { oneRmKg: roundHalf(raw), method, confidence };
}

/**
 * Орієнтовний 1ПМ як частка маси тіла для варіанту «Не знаю».
 * Для підтягувань — загальна вага (тіло + обтяження).
 */
const LEVEL_RATIOS: Record<Sex, Record<ExperienceLevel, Record<BaseLift, number>>> = {
  male: {
    beginner: { squat: 0.75, bench: 0.6, deadlift: 1.0, ohp: 0.4, row: 0.5, pullup: 1.0 },
    intermediate: { squat: 1.25, bench: 1.0, deadlift: 1.5, ohp: 0.65, row: 0.8, pullup: 1.15 },
    advanced: { squat: 1.75, bench: 1.35, deadlift: 2.0, ohp: 0.85, row: 1.1, pullup: 1.35 },
  },
  female: {
    beginner: { squat: 0.5, bench: 0.35, deadlift: 0.65, ohp: 0.25, row: 0.3, pullup: 0.7 },
    intermediate: { squat: 0.9, bench: 0.6, deadlift: 1.1, ohp: 0.4, row: 0.5, pullup: 1.0 },
    advanced: { squat: 1.3, bench: 0.85, deadlift: 1.5, ohp: 0.55, row: 0.7, pullup: 1.15 },
  },
};

export function estimateOneRmFromLevel(
  lift: BaseLift,
  sex: Sex,
  level: ExperienceLevel,
  bodyWeightKg: number,
): OneRmEstimate {
  const ratio = LEVEL_RATIOS[sex][level][lift];
  return { oneRmKg: roundHalf(ratio * bodyWeightKg), method: 'level', confidence: 'low' };
}

export interface LoggedSet {
  weightKg: number;
  reps: number;
  /** RPE 1–10; без нього вважаємо, що підхід був до відмови. */
  rpe?: number;
}

/**
 * Оновлює 1ПМ з виконаного підходу. Запас повторень (10 − RPE) додається до повторень.
 * Оцінка за рівнем завжди замінюється реальною; інакше 1ПМ лише зростає.
 */
export function updateOneRmFromSet(
  current: OneRmEstimate | null,
  set: LoggedSet,
): OneRmEstimate | null {
  const reserve = set.rpe === undefined ? 0 : Math.max(0, Math.round(10 - set.rpe));
  const fromSet = estimateOneRm(set.weightKg, set.reps + reserve);
  if (!fromSet) return current;
  if (!current || current.method === 'level' || fromSet.oneRmKg > current.oneRmKg) return fromSet;
  return current;
}
