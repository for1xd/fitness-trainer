import {
  BASE_LIFT_EXERCISE,
  isWeighted,
  LOAD_INCREMENT_KG,
  type Exercise,
} from '@/features/catalog/data';
import type { OneRmEstimate } from '@/features/strength/logic/oneRm';

import type { Workout } from '../types';
import { nextWeightForRange, roundToIncrement, type ProgressionDecision } from './progression';

export interface WeightSuggestion {
  weightKg?: number;
  source: 'history' | 'estimate' | 'none';
  decision?: ProgressionDecision;
}

/** 1ПМ вправи: власна оцінка, інакше — базова вправа × коефіцієнт. */
export function exerciseOneRm(
  exercise: Exercise,
  estimates: Record<string, OneRmEstimate | undefined>,
): number | undefined {
  const own = estimates[exercise.id];
  if (own) return own.oneRmKg;
  if (!exercise.base_lift || exercise.base_ratio === null) return undefined;
  const base = estimates[BASE_LIFT_EXERCISE[exercise.base_lift]];
  return base ? base.oneRmKg * exercise.base_ratio : undefined;
}

interface SessionSets {
  date: string;
  sets: { reps: number; weightKg: number; rpe?: number }[];
}

/** Робочі підходи вправи з минулих тренувань, найновіші — першими. */
export function exerciseHistory(workouts: Workout[], exerciseId: string): SessionSets[] {
  return workouts
    .map((w) => ({ date: w.date, sets: w.sets.filter((s) => s.exerciseId === exerciseId) }))
    .filter((s) => s.sets.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Підказка ваги на сьогодні:
 * 1) минуле тренування → прогресія (+крок, повтор або −7,5 %);
 * 2) оцінка 1ПМ × відсоток програми;
 * 3) немає даних — користувач підбирає вагу сам за RPE.
 */
export function suggestWeight(
  exercise: Exercise,
  plan: { repsMin: number; repsMax: number; pct1rm?: number },
  workouts: Workout[],
  estimates: Record<string, OneRmEstimate | undefined>,
): WeightSuggestion {
  if (!isWeighted(exercise.load_type)) return { source: 'none' };
  const increment = LOAD_INCREMENT_KG[exercise.load_type];
  const history = exerciseHistory(workouts, exercise.id);
  const last = history[0];
  const lastWeight = last ? Math.max(...last.sets.map((s) => s.weightKg)) : 0;
  if (last && lastWeight > 0) {
    const previousFailures = history
      .slice(1)
      .findIndex((h) => !h.sets.some((s) => s.reps < plan.repsMin));
    const result = nextWeightForRange({
      currentWeightKg: lastWeight,
      region: exercise.region === 'lower' ? 'lower' : 'upper',
      sets: last.sets.filter((s) => s.weightKg === lastWeight),
      repsMin: plan.repsMin,
      repsMax: plan.repsMax,
      previousFailures: previousFailures === -1 ? history.length - 1 : previousFailures,
      incrementKg: increment,
    });
    return { weightKg: result.weightKg, source: 'history', decision: result.decision };
  }
  const oneRm = exerciseOneRm(exercise, estimates);
  if (oneRm && plan.pct1rm) {
    const w = roundToIncrement(oneRm * plan.pct1rm, increment);
    if (w > 0) return { weightKg: w, source: 'estimate' };
  }
  return { source: 'none' };
}
