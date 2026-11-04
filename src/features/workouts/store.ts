import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { useStrength } from '@/features/strength/store';
import { persistStorage } from '@/lib/persistStorage';
import { mergeLww, type Row } from '@/lib/sync/outbox';
import { registerSyncTable } from '@/lib/sync/registry';
import { queueRow } from '@/lib/sync/store';

import {
  PROGRAM_SELECT,
  programFromRow,
  programToRow,
  WORKOUT_SELECT,
  workoutFromRow,
  workoutToRow,
} from './api/rows';
import { durationMin, liveToSets, tonnageKg } from './logic/summary';
import type { ActiveWorkout, LiveExercise, Program, Workout } from './types';

export interface FinishResult {
  workout: Workout;
  tonnageKg: number;
  improvedExerciseIds: string[];
}

interface WorkoutsState {
  program: Program | null;
  workouts: Workout[];
  active: ActiveWorkout | null;

  saveProgram: (program: Program) => void;
  /** Замінює вправу в програмі назавжди (напр. тренажера немає в залі). */
  replaceProgramExercise: (dayId: string, programExerciseId: string, exerciseId: string) => void;

  startWorkout: (workout: ActiveWorkout) => void;
  updateActive: (fn: (w: ActiveWorkout) => ActiveWorkout) => void;
  finishWorkout: (meta: { wellbeing?: number; notes?: string }) => FinishResult | null;
  discardActive: () => void;
  deleteWorkout: (id: string) => void;

  applyRemote: (data: {
    program?: Program;
    workouts?: Workout[];
    deletedWorkoutIds?: string[];
  }) => void;
  reset: () => void;
}

const now = () => new Date().toISOString();

export const useWorkouts = create<WorkoutsState>()(
  persist(
    (set, get) => ({
      program: null,
      workouts: [],
      active: null,

      saveProgram: (program) => {
        const previous = get().program;
        // Стара програма архівується (дні лишаються — на них посилаються минулі тренування)
        if (previous && previous.id !== program.id) {
          queueRow('programs', programToRow({ ...previous, updatedAt: now() }, now()));
        }
        const next = { ...program, updatedAt: now() };
        set({ program: next });
        queueRow('programs', programToRow(next));
      },

      replaceProgramExercise: (dayId, programExerciseId, exerciseId) => {
        const program = get().program;
        if (!program) return;
        const next: Program = {
          ...program,
          updatedAt: now(),
          days: program.days.map((d) =>
            d.id !== dayId
              ? d
              : {
                  ...d,
                  exercises: d.exercises.map((e) =>
                    e.id === programExerciseId ? { ...e, exerciseId } : e,
                  ),
                },
          ),
        };
        set({ program: next });
        queueRow('programs', programToRow(next));
      },

      startWorkout: (workout) => set({ active: workout }),
      updateActive: (fn) => set((s) => (s.active ? { active: fn(s.active) } : s)),

      finishWorkout: ({ wellbeing, notes }) => {
        const active = get().active;
        if (!active) return null;
        const finishedAt = now();
        const sets = liveToSets(active.exercises, randomUUID);
        const workout: Workout = {
          id: active.id,
          date: active.date,
          programDayId: active.programDayId,
          name: active.name,
          startedAt: active.startedAt,
          finishedAt,
          durationMin: durationMin(active.startedAt, finishedAt),
          wellbeing,
          notes: notes?.trim() || undefined,
          sets,
          updatedAt: finishedAt,
        };
        set((s) => ({
          workouts: [...s.workouts.filter((w) => w.id !== workout.id), workout],
          active: null,
        }));
        queueRow('workouts', workoutToRow(workout));
        const improvedExerciseIds = useStrength.getState().applySets(sets);
        return { workout, tonnageKg: tonnageKg(sets), improvedExerciseIds };
      },

      discardActive: () => set({ active: null }),

      deleteWorkout: (id) => {
        const current = get().workouts.find((w) => w.id === id);
        if (!current) return;
        set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) }));
        const stamp = now();
        queueRow('workouts', workoutToRow({ ...current, updatedAt: stamp }, stamp));
      },

      applyRemote: ({ program, workouts = [], deletedWorkoutIds = [] }) =>
        set((s) => ({
          program:
            program && (!s.program || program.updatedAt > s.program.updatedAt)
              ? program
              : s.program,
          workouts: mergeLww(s.workouts, workouts, deletedWorkoutIds),
        })),

      reset: () => set({ program: null, workouts: [], active: null }),
    }),
    { name: 'workouts', storage: persistStorage },
  ),
);

/** Оновлює один підхід живого тренування. */
export function patchSet(
  w: ActiveWorkout,
  exerciseIndex: number,
  setIndex: number,
  patch: Partial<LiveExercise['sets'][number]>,
): ActiveWorkout {
  return {
    ...w,
    exercises: w.exercises.map((ex, i) =>
      i !== exerciseIndex
        ? ex
        : { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) },
    ),
  };
}

// ─────────── синхронізація ───────────
registerSyncTable({
  table: 'programs',
  order: 50,
  owner: 'user_id',
  select: PROGRAM_SELECT,
  push: async (client, rows) => {
    for (const row of rows) {
      const { days, exercises, ...program } = row as Row & { days: Row[]; exercises: Row[] };
      const p = await client.from('programs').upsert(program);
      if (p.error) return p.error.message;
      if (program.deleted_at) continue;
      const d = await client.from('program_days').upsert(days);
      if (d.error) return d.error.message;
      const dayIds = days.map((x) => String(x.id));
      const del = await client.from('program_exercises').delete().in('program_day_id', dayIds);
      if (del.error) return del.error.message;
      if (exercises.length) {
        const ins = await client.from('program_exercises').insert(exercises);
        if (ins.error) return ins.error.message;
      }
    }
    return null;
  },
  applyRemote: (rows) => {
    const active = rows.filter((r) => !r.deleted_at && r.is_active).at(-1);
    if (active) useWorkouts.getState().applyRemote({ program: programFromRow(active) });
  },
});

registerSyncTable({
  table: 'workouts',
  order: 60,
  owner: 'user_id',
  select: WORKOUT_SELECT,
  push: async (client, rows) => {
    const workouts = rows.map(({ sets: _sets, ...rest }) => rest);
    const w = await client.from('workouts').upsert(workouts);
    if (w.error) return w.error.message;
    const ids = rows.map((r) => String(r.id));
    const del = await client.from('workout_sets').delete().in('workout_id', ids);
    if (del.error) return del.error.message;
    const sets = rows.filter((r) => !r.deleted_at).flatMap((r) => (r.sets as Row[]) ?? []);
    if (sets.length) {
      const ins = await client.from('workout_sets').insert(sets);
      if (ins.error) return ins.error.message;
    }
    return null;
  },
  applyRemote: (rows) =>
    useWorkouts.getState().applyRemote({
      workouts: rows.filter((r) => !r.deleted_at).map(workoutFromRow),
      deletedWorkoutIds: rows.filter((r) => r.deleted_at).map((r) => String(r.id)),
    }),
});
