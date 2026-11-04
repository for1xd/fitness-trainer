import { getExercise } from '@/features/catalog/data';
import type { OneRmEstimate } from '@/features/strength/logic/oneRm';

import type { ActiveWorkout, LiveExercise, Program, ProgramExercise, Workout } from '../types';
import { deloadSets, isDeloadWeek } from './progression';
import { programWeek } from './schedule';
import { suggestWeight } from './weights';

/** Вправа живого тренування з програми: підказка ваги та порожні підходи. */
export function liveExercise(
  plan: Pick<
    ProgramExercise,
    'exerciseId' | 'sets' | 'repsMin' | 'repsMax' | 'pct1rm' | 'restSec' | 'targetRpe'
  >,
  workouts: Workout[],
  estimates: Record<string, OneRmEstimate | undefined>,
  deload: boolean,
): LiveExercise {
  const exercise = getExercise(plan.exerciseId);
  const suggestion = exercise
    ? suggestWeight(exercise, plan, workouts, estimates)
    : { source: 'none' as const };
  const sets = deload ? deloadSets(plan.sets) : plan.sets;
  return {
    exerciseId: plan.exerciseId,
    repsMin: plan.repsMin,
    repsMax: plan.repsMax,
    restSec: plan.restSec,
    targetRpe: plan.targetRpe,
    weightSource: suggestion.source,
    decision: suggestion.decision,
    sets: Array.from({ length: sets }, () => ({ weightKg: suggestion.weightKg, done: false })),
  };
}

export function buildActiveWorkout(params: {
  id: string;
  program: Program;
  dayIndex: number;
  date: string;
  workouts: Workout[];
  estimates: Record<string, OneRmEstimate | undefined>;
  now?: Date;
}): ActiveWorkout {
  const { program, dayIndex, date, workouts, estimates } = params;
  const day = program.days[dayIndex]!;
  const deload = isDeloadWeek(programWeek(program.startDate, date), program.deloadEveryWeeks);
  return {
    id: params.id,
    date,
    programDayId: day.id,
    name: day.name,
    startedAt: (params.now ?? new Date()).toISOString(),
    deload,
    exercises: day.exercises.map((e) => liveExercise(e, workouts, estimates, deload)),
  };
}
