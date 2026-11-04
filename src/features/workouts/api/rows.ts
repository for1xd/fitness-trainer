import type { Row } from '@/lib/sync/outbox';

import type { Program, Workout } from '../types';

const n = (v: unknown) => Number(v ?? 0);
const opt = (v: unknown) => (v === null || v === undefined ? undefined : v);

// ─────────── programs → program_days → program_exercises ───────────
export const programToRow = (p: Program, deletedAt?: string): Row & { id: string } => ({
  id: p.id,
  name: p.name,
  goal: p.goal,
  split: p.split,
  days_per_week: p.daysPerWeek,
  weekdays: p.weekdays,
  focus: p.focus,
  experience: p.experience,
  session_min: p.sessionMin,
  gym_id: p.gymId ?? null,
  start_date: p.startDate,
  deload_every_weeks: p.deloadEveryWeeks,
  is_active: !deletedAt,
  updated_at: p.updatedAt,
  deleted_at: deletedAt ?? null,
  days: p.days.map((d) => ({
    id: d.id,
    program_id: p.id,
    day_index: d.dayIndex,
    template: d.template,
    name: d.name,
    muscle_focus: d.muscleFocus,
  })),
  exercises: p.days.flatMap((d) =>
    d.exercises.map((e, position) => ({
      id: e.id,
      program_day_id: d.id,
      exercise_id: e.exerciseId,
      position,
      sets: e.sets,
      reps_min: e.repsMin,
      reps_max: e.repsMax,
      pct_1rm: e.pct1rm ?? null,
      rest_sec: e.restSec,
      target_rpe: e.targetRpe,
    })),
  ),
});

export const PROGRAM_SELECT = '*, program_days(*, program_exercises(*))';

export const programFromRow = (r: Row): Program => ({
  id: String(r.id),
  name: String(r.name),
  goal: r.goal as Program['goal'],
  split: r.split as Program['split'],
  daysPerWeek: n(r.days_per_week),
  weekdays: ((r.weekdays as number[] | null) ?? []).map(Number),
  focus: r.focus as Program['focus'],
  experience: r.experience as Program['experience'],
  sessionMin: n(r.session_min),
  gymId: opt(r.gym_id) as string | undefined,
  startDate: String(r.start_date),
  deloadEveryWeeks: n(r.deload_every_weeks),
  updatedAt: String(r.updated_at),
  days: ((r.program_days as Row[] | undefined) ?? [])
    .map((d) => ({
      id: String(d.id),
      dayIndex: n(d.day_index),
      template: d.template as Program['days'][number]['template'],
      name: String(d.name),
      muscleFocus: ((d.muscle_focus as string[] | null) ?? []).map(String),
      exercises: ((d.program_exercises as Row[] | undefined) ?? [])
        .sort((a, b) => n(a.position) - n(b.position))
        .map((e) => ({
          id: String(e.id),
          exerciseId: String(e.exercise_id),
          sets: n(e.sets),
          repsMin: n(e.reps_min),
          repsMax: n(e.reps_max),
          pct1rm: e.pct_1rm === null || e.pct_1rm === undefined ? undefined : n(e.pct_1rm),
          restSec: n(e.rest_sec),
          targetRpe: n(e.target_rpe),
        })),
    }))
    .sort((a, b) => a.dayIndex - b.dayIndex),
});

// ─────────── workouts → workout_sets ───────────
export const workoutToRow = (w: Workout, deletedAt?: string): Row & { id: string } => ({
  id: w.id,
  date: w.date,
  program_day_id: w.programDayId ?? null,
  name: w.name,
  status: 'done',
  started_at: w.startedAt ?? null,
  finished_at: w.finishedAt ?? null,
  duration_min: w.durationMin ?? null,
  wellbeing: w.wellbeing ?? null,
  notes: w.notes ?? null,
  updated_at: w.updatedAt,
  deleted_at: deletedAt ?? null,
  sets: w.sets.map((s) => ({
    id: s.id,
    workout_id: w.id,
    exercise_id: s.exerciseId,
    position: s.position,
    set_index: s.setIndex,
    weight_kg: s.weightKg,
    reps: s.reps,
    rpe: s.rpe ?? null,
  })),
});

export const WORKOUT_SELECT = '*, workout_sets(*)';

export const workoutFromRow = (r: Row): Workout => ({
  id: String(r.id),
  date: String(r.date),
  programDayId: opt(r.program_day_id) as string | undefined,
  name: String(r.name ?? ''),
  startedAt: opt(r.started_at) as string | undefined,
  finishedAt: opt(r.finished_at) as string | undefined,
  durationMin:
    r.duration_min === null || r.duration_min === undefined ? undefined : n(r.duration_min),
  wellbeing: r.wellbeing === null || r.wellbeing === undefined ? undefined : n(r.wellbeing),
  notes: opt(r.notes) as string | undefined,
  updatedAt: String(r.updated_at),
  sets: ((r.workout_sets as Row[] | undefined) ?? [])
    .map((s) => ({
      id: String(s.id),
      exerciseId: String(s.exercise_id),
      position: n(s.position),
      setIndex: n(s.set_index),
      weightKg: n(s.weight_kg),
      reps: n(s.reps),
      rpe: s.rpe === null || s.rpe === undefined ? undefined : n(s.rpe),
    }))
    .sort((a, b) => a.position - b.position || a.setIndex - b.setIndex),
});
