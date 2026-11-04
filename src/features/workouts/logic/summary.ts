import type { LiveExercise, WorkoutSet } from '../types';

/** Тоннаж: сума вага × повтори. */
export function tonnageKg(sets: Pick<WorkoutSet, 'weightKg' | 'reps'>[]): number {
  return Math.round(sets.reduce((s, x) => s + x.weightKg * x.reps, 0));
}

/** Виконані підходи живого тренування → записи для збереження. */
export function liveToSets(
  exercises: LiveExercise[],
  makeId: () => string,
): Omit<WorkoutSet, never>[] {
  const out: WorkoutSet[] = [];
  exercises.forEach((ex, position) => {
    let setIndex = 0;
    for (const s of ex.sets) {
      if (!s.done || s.reps === undefined || s.reps <= 0) continue;
      out.push({
        id: makeId(),
        exerciseId: ex.exerciseId,
        position,
        setIndex: setIndex++,
        weightKg: s.weightKg ?? 0,
        reps: s.reps,
        rpe: s.rpe,
      });
    }
  });
  return out;
}

export function durationMin(startedAt: string, finishedAt: string): number {
  return Math.max(1, Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 60000));
}
