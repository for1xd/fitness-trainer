import type { Program, Workout } from '../types';
import { programFromRow, programToRow, workoutFromRow, workoutToRow } from './rows';

const program: Program = {
  id: 'p1',
  name: 'Верх / низ',
  goal: 'gain',
  focus: 'hypertrophy',
  experience: 'intermediate',
  split: 'upper_lower',
  daysPerWeek: 4,
  weekdays: [1, 2, 4, 5],
  sessionMin: 60,
  gymId: 'g1',
  startDate: '2026-11-02',
  deloadEveryWeeks: 5,
  updatedAt: 'u',
  days: [
    {
      id: 'd1',
      dayIndex: 0,
      template: 'upper',
      name: 'Верх',
      muscleFocus: ['chest', 'back'],
      exercises: [
        {
          id: 'e1',
          exerciseId: 'barbell_bench_press',
          sets: 4,
          repsMin: 6,
          repsMax: 10,
          pct1rm: 0.75,
          restSec: 90,
          targetRpe: 8,
        },
        {
          id: 'e2',
          exerciseId: 'push_up',
          sets: 3,
          repsMin: 10,
          repsMax: 15,
          restSec: 60,
          targetRpe: 8,
        },
      ],
    },
  ],
};

describe('рядки програм і тренувань', () => {
  it('програма: туди й назад через вкладені таблиці', () => {
    const row = programToRow(program);
    expect(row.exercises).toHaveLength(2);
    const { days, exercises, ...programRow } = row as unknown as Record<string, unknown> & {
      days: Record<string, unknown>[];
      exercises: Record<string, unknown>[];
    };
    const fromServer = programFromRow({
      ...programRow,
      program_days: days.map((d) => ({
        ...d,
        program_exercises: exercises.filter((e) => e.program_day_id === d.id).reverse(),
      })),
    });
    expect(fromServer).toEqual(program);
    expect(programToRow(program, 'x').is_active).toBe(false);
  });

  it('тренування з підходами', () => {
    const w: Workout = {
      id: 'w1',
      date: '2026-11-04',
      name: 'Верх',
      programDayId: 'd1',
      startedAt: 's',
      finishedAt: 'f',
      durationMin: 55,
      wellbeing: 4,
      updatedAt: 'u',
      sets: [
        {
          id: 's1',
          exerciseId: 'barbell_bench_press',
          position: 0,
          setIndex: 0,
          weightKg: 70,
          reps: 8,
          rpe: 8,
        },
      ],
    };
    const { sets, ...row } = workoutToRow(w) as unknown as Record<string, unknown> & {
      sets: Record<string, unknown>[];
    };
    expect(
      workoutFromRow({ ...row, workout_sets: sets.map((s) => ({ ...s, weight_kg: '70' })) }),
    ).toEqual(w);
  });
});
