import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useCallback } from 'react';

import { useStrength } from '@/features/strength/store';
import { addDaysIso, todayIso } from '@/lib/dates';

import { buildActiveWorkout } from './logic/session';
import { scheduledDayIndex } from './logic/schedule';
import { useWorkouts } from './store';
import type { Program } from './types';

/** Починає тренування за днем програми й відкриває екран живого тренування. */
export function useStartWorkout() {
  return useCallback((dayIndex: number, date: string = todayIso()) => {
    const { program, workouts, active, startWorkout } = useWorkouts.getState();
    if (!program) return;
    if (!active) {
      startWorkout(
        buildActiveWorkout({
          id: randomUUID(),
          program,
          dayIndex,
          date,
          workouts,
          estimates: useStrength.getState().estimates,
        }),
      );
    }
    router.push('/workout/live');
  }, []);
}

export interface DayStatus {
  date: string;
  /** Індекс запланованого дня програми */
  plannedIndex: number | null;
  doneWorkoutIds: string[];
  groups: string[];
}

/** Статус дати для календаря: заплановане й виконане. */
export function dayStatus(
  program: Program | null,
  workouts: { id: string; date: string; programDayId?: string; sets: { exerciseId: string }[] }[],
  date: string,
  groupsOfWorkout: (w: { sets: { exerciseId: string }[] }) => string[],
): DayStatus {
  const plannedIndex = program ? scheduledDayIndex(program, date) : null;
  const done = workouts.filter((w) => w.date === date);
  const groups = done.length
    ? [...new Set(done.flatMap(groupsOfWorkout))]
    : plannedIndex !== null && program
      ? (program.days[plannedIndex]?.muscleFocus ?? [])
      : [];
  return { date, plannedIndex, doneWorkoutIds: done.map((w) => w.id), groups };
}

/** Найближче заплановане тренування після дати (до 14 днів). */
export function nextPlanned(program: Program | null, after: string) {
  if (!program) return null;
  for (let i = 1; i <= 14; i++) {
    const date = addDaysIso(after, i);
    const idx = scheduledDayIndex(program, date);
    if (idx !== null) return { date, dayIndex: idx };
  }
  return null;
}

export function useNextPlanned(after: string) {
  const program = useWorkouts((s) => s.program);
  return nextPlanned(program, after);
}
