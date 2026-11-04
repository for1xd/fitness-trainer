export type TrainingZone = 'strength' | 'hypertrophy' | 'endurance';
export type BodyRegion = 'upper' | 'lower';

export interface ZoneParams {
  reps: [number, number];
  /** Частка від 1ПМ */
  pct: [number, number];
  restSec: number;
  targetRpe: number;
}

export const TRAINING_ZONES: Record<TrainingZone, ZoneParams> = {
  strength: { reps: [3, 6], pct: [0.8, 0.9], restSec: 180, targetRpe: 8 },
  hypertrophy: { reps: [6, 12], pct: [0.65, 0.8], restSec: 90, targetRpe: 8 },
  endurance: { reps: [12, 20], pct: [0.5, 0.65], restSec: 60, targetRpe: 7 },
};

export const PROGRESSION_STEP_KG: Record<BodyRegion, number> = { upper: 2.5, lower: 5 };
export const FAILURE_DECREASE = 0.075;
export const MAX_RPE_FOR_INCREASE = 8;
export const DEFAULT_DELOAD_EVERY_WEEKS = 5;
export const DELOAD_VOLUME_SHARE = 0.6;

export function roundToIncrement(kg: number, incrementKg = 2.5): number {
  return Math.round(kg / incrementKg) * incrementKg;
}

/** Робоча вага: середина відсоткового діапазону зони, округлена до кроку снаряда. */
export function workingWeightKg(
  oneRmKg: number,
  zone: TrainingZone,
  incrementKg = 2.5,
  pct?: number,
): number {
  const [lo, hi] = TRAINING_ZONES[zone].pct;
  const share = pct ?? (lo + hi) / 2;
  return roundToIncrement(oneRmKg * share, incrementKg);
}

export interface PerformedSet {
  targetReps: number;
  reps: number;
  rpe?: number;
}

export type ProgressionDecision = 'increase' | 'repeat' | 'decrease';

export interface ProgressionInput {
  currentWeightKg: number;
  region: BodyRegion;
  sets: PerformedSet[];
  /** Скільки тренувань поспіль перед цим були провалені. */
  previousFailures?: number;
  incrementKg?: number;
}

export interface ProgressionResult {
  weightKg: number;
  decision: ProgressionDecision;
}

/**
 * Усі повторення виконані з RPE ≤ 8 → +2,5 кг (верх) / +5 кг (низ).
 * Провал → повторити вагу; другий провал поспіль → −7,5 %.
 * Виконано, але важко (RPE > 8) → повторити.
 */
export function nextSessionWeight({
  currentWeightKg,
  region,
  sets,
  previousFailures = 0,
  incrementKg = 2.5,
}: ProgressionInput): ProgressionResult {
  const failed = sets.some((s) => s.reps < s.targetReps);
  if (failed) {
    if (previousFailures >= 1) {
      return {
        weightKg: roundToIncrement(currentWeightKg * (1 - FAILURE_DECREASE), incrementKg),
        decision: 'decrease',
      };
    }
    return { weightKg: currentWeightKg, decision: 'repeat' };
  }
  const easyEnough = sets.every((s) => (s.rpe ?? MAX_RPE_FOR_INCREASE) <= MAX_RPE_FOR_INCREASE);
  if (!easyEnough) return { weightKg: currentWeightKg, decision: 'repeat' };
  return { weightKg: currentWeightKg + PROGRESSION_STEP_KG[region], decision: 'increase' };
}

/** Тиждень розвантаження: кожен N-й тиждень (1-based), N у межах 4–6. */
export function isDeloadWeek(weekNumber: number, everyWeeks = DEFAULT_DELOAD_EVERY_WEEKS): boolean {
  const every = Math.min(6, Math.max(4, everyWeeks));
  return weekNumber > 0 && weekNumber % every === 0;
}

/** На розвантаженні обсяг (кількість підходів) зменшується на ~40 %. */
export function deloadSets(sets: number): number {
  return Math.max(1, Math.round(sets * DELOAD_VOLUME_SHARE));
}

export interface RangeProgressionInput {
  currentWeightKg: number;
  region: BodyRegion;
  sets: { reps: number; rpe?: number }[];
  repsMin: number;
  repsMax: number;
  previousFailures?: number;
  incrementKg?: number;
}

/**
 * Прогресія для діапазону повторень (напр. 8–12):
 * у всіх підходах ≥ верхньої межі з RPE ≤ 8 → +2,5 кг (верх) / +5 кг (низ);
 * хоч один підхід < нижньої межі → повтор, другий раз поспіль → −7,5 %;
 * інакше — та сама вага, додаємо повтори.
 */
export function nextWeightForRange({
  currentWeightKg,
  region,
  sets,
  repsMin,
  repsMax,
  previousFailures = 0,
  incrementKg = 2.5,
}: RangeProgressionInput): ProgressionResult {
  if (!sets.length) return { weightKg: currentWeightKg, decision: 'repeat' };
  if (sets.some((s) => s.reps < repsMin)) {
    if (previousFailures >= 1) {
      return {
        weightKg: Math.max(
          0,
          roundToIncrement(currentWeightKg * (1 - FAILURE_DECREASE), incrementKg),
        ),
        decision: 'decrease',
      };
    }
    return { weightKg: currentWeightKg, decision: 'repeat' };
  }
  const topped = sets.every(
    (s) => s.reps >= repsMax && (s.rpe ?? MAX_RPE_FOR_INCREASE) <= MAX_RPE_FOR_INCREASE,
  );
  if (!topped) return { weightKg: currentWeightKg, decision: 'repeat' };
  const step = Math.max(incrementKg, roundToIncrement(PROGRESSION_STEP_KG[region], incrementKg));
  return { weightKg: currentWeightKg + step, decision: 'increase' };
}
