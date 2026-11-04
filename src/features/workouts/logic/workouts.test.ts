import { alternatives, isAvailable } from '@/features/catalog/logic/availability';
import { EXERCISES, GYM_PRESETS, getExercise } from '@/features/catalog/data';

import type { Workout } from '../types';
import { generateProgram, maxExercises, pickExercise, prescribe } from './generator';
import { nextWeightForRange } from './progression';
import { monthGrid, programWeek, scheduledDayIndex, weekOf, isoWeekday } from './schedule';
import { liveToSets, tonnageKg } from './summary';
import { exerciseOneRm, suggestWeight } from './weights';

const preset = (slug: string) => new Set(GYM_PRESETS.find((g) => g.slug === slug)!.equipment);
const full = preset('full_gym');
const home = preset('home_dumbbells');
const none = preset('bodyweight');

describe('каталог', () => {
  it('усі базові вправи є в каталозі', () => {
    for (const id of ['barbell_back_squat', 'barbell_bench_press', 'barbell_deadlift', 'pull_up']) {
      expect(getExercise(id)).toBeDefined();
    }
  });

  it('доступність за обладнанням', () => {
    const squat = getExercise('barbell_back_squat')!;
    expect(isAvailable(squat, full)).toBe(true);
    expect(isAvailable(squat, home)).toBe(false);
    expect(isAvailable(getExercise('push_up')!, none)).toBe(true);
  });

  it('заміна — той самий патерн і тільки доступне обладнання', () => {
    const squat = getExercise('barbell_back_squat')!;
    const alts = alternatives(squat, EXERCISES, home);
    expect(alts.length).toBeGreaterThan(0);
    expect(alts[0]?.pattern).toBe('squat');
    expect(alts.every((e) => isAvailable(e, home))).toBe(true);
  });
});

describe('генератор програм', () => {
  const base = {
    goal: 'gain' as const,
    focus: 'hypertrophy' as const,
    experience: 'intermediate' as const,
    sessionMin: 60,
    equipment: full,
  };

  it('спліт за кількістю днів', () => {
    expect(generateProgram({ ...base, daysPerWeek: 3 }).split).toBe('full_body');
    expect(generateProgram({ ...base, daysPerWeek: 4 }).split).toBe('upper_lower');
    expect(generateProgram({ ...base, daysPerWeek: 6 }).days.map((d) => d.template)).toEqual([
      'push',
      'pull',
      'legs',
      'push',
      'pull',
      'legs',
    ]);
  });

  it('кількість вправ відповідає тривалості, без повторів у дні', () => {
    const p = generateProgram({ ...base, daysPerWeek: 4, sessionMin: 45 });
    for (const day of p.days) {
      expect(day.exercises.length).toBeLessThanOrEqual(maxExercises(45));
      const ids = day.exercises.map((e) => e.exerciseId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('повторні дні відрізняються вправами', () => {
    const p = generateProgram({ ...base, daysPerWeek: 4 });
    expect(p.days[0]!.exercises[0]!.exerciseId).not.toBe(p.days[2]!.exercises[0]!.exerciseId);
  });

  it('вдома — лише вправи з гантелями, турніком і власною вагою', () => {
    const p = generateProgram({ ...base, daysPerWeek: 3, equipment: home });
    const all = p.days.flatMap((d) => d.exercises.map((e) => getExercise(e.exerciseId)!));
    expect(all.length).toBeGreaterThan(8);
    expect(all.every((e) => isAvailable(e, home))).toBe(true);
  });

  it('без обладнання програма все одно будується', () => {
    const p = generateProgram({ ...base, daysPerWeek: 2, equipment: none });
    expect(p.days.every((d) => d.exercises.length >= 3)).toBe(true);
  });

  it('зони: сила 4–6 для базових, ізоляція 10–15', () => {
    const squat = getExercise('barbell_back_squat')!;
    expect(prescribe(squat, 0, 'strength', 'advanced')).toMatchObject({
      repsMin: 4,
      repsMax: 6,
      sets: 5,
      pct1rm: 0.85,
    });
    const curl = getExercise('dumbbell_curl')!;
    expect(prescribe(curl, 5, 'hypertrophy', 'beginner')).toMatchObject({
      repsMin: 10,
      repsMax: 15,
      sets: 2,
      restSec: 60,
    });
    expect(prescribe(getExercise('plank')!, 6, 'hypertrophy', 'beginner')).toMatchObject({
      repsMin: 30,
      repsMax: 60,
    });
  });

  it('новачкам спершу простіші вправи', () => {
    const e = pickExercise('squat', full, new Set(), 'beginner');
    expect(e!.difficulty).toBeLessThanOrEqual(2);
  });

  it("дні м'язових груп для календаря", () => {
    const p = generateProgram({ ...base, daysPerWeek: 4 });
    expect(p.days[1]!.muscleFocus).toContain('legs');
  });
});

describe('розклад', () => {
  const program = { startDate: '2026-11-02', weekdays: [1, 3, 5], days: [1, 2, 3] };

  it('день тижня', () => {
    expect(isoWeekday('2026-11-02')).toBe(1);
    expect(isoWeekday('2026-11-08')).toBe(7);
  });

  it('дні програми по колу', () => {
    expect(scheduledDayIndex(program, '2026-11-02')).toBe(0);
    expect(scheduledDayIndex(program, '2026-11-03')).toBeNull();
    expect(scheduledDayIndex(program, '2026-11-04')).toBe(1);
    expect(scheduledDayIndex(program, '2026-11-06')).toBe(2);
    expect(scheduledDayIndex(program, '2026-11-09')).toBe(0);
    expect(scheduledDayIndex(program, '2026-11-01')).toBeNull();
  });

  it('номер тижня', () => {
    expect(programWeek('2026-11-02', '2026-11-08')).toBe(1);
    expect(programWeek('2026-11-02', '2026-11-30')).toBe(5);
  });

  it('сітка місяця з понеділка', () => {
    const grid = monthGrid(2026, 10); // листопад 2026, 1-ше — неділя
    expect(grid[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
    expect(weekOf('2026-11-04')[0]).toBe('2026-11-02');
  });
});

describe('прогресія в діапазоні', () => {
  const sets = (reps: number[], rpe?: number) => reps.map((r) => ({ reps: r, rpe }));
  it('верхня межа в усіх підходах → +крок', () => {
    expect(
      nextWeightForRange({
        currentWeightKg: 60,
        region: 'upper',
        sets: sets([10, 10, 10], 8),
        repsMin: 8,
        repsMax: 10,
      }),
    ).toEqual({ weightKg: 62.5, decision: 'increase' });
    expect(
      nextWeightForRange({
        currentWeightKg: 100,
        region: 'lower',
        sets: sets([10, 10]),
        repsMin: 6,
        repsMax: 10,
      }).weightKg,
    ).toBe(105);
  });
  it('гантелі: крок не менший за крок гантелей', () => {
    expect(
      nextWeightForRange({
        currentWeightKg: 20,
        region: 'upper',
        sets: sets([12, 12]),
        repsMin: 8,
        repsMax: 12,
        incrementKg: 2,
      }).weightKg,
    ).toBe(22);
  });
  it('у діапазоні — повтор, нижче — повтор / зниження', () => {
    expect(
      nextWeightForRange({
        currentWeightKg: 60,
        region: 'upper',
        sets: sets([10, 9, 8]),
        repsMin: 8,
        repsMax: 10,
      }).decision,
    ).toBe('repeat');
    expect(
      nextWeightForRange({
        currentWeightKg: 80,
        region: 'upper',
        sets: sets([8, 6]),
        repsMin: 8,
        repsMax: 10,
        previousFailures: 1,
      }),
    ).toEqual({ weightKg: 75, decision: 'decrease' });
  });
});

describe('підказка ваги', () => {
  const bench = getExercise('barbell_bench_press')!;
  const incline = getExercise('incline_dumbbell_press')!;
  const estimates = {
    barbell_bench_press: { oneRmKg: 100, method: 'epley' as const, confidence: 'high' as const },
  };
  const plan = { repsMin: 8, repsMax: 12, pct1rm: 0.7 };

  it('1ПМ через базову вправу', () => {
    expect(exerciseOneRm(incline, estimates)).toBeCloseTo(32);
  });

  it('без історії — з оцінки 1ПМ', () => {
    expect(suggestWeight(bench, plan, [], estimates)).toEqual({ weightKg: 70, source: 'estimate' });
    expect(suggestWeight(incline, plan, [], estimates).weightKg).toBe(22); // 32 × 0.7 = 22.4 → 22
  });

  it('з історією — прогресія від минулого тренування', () => {
    const workouts: Workout[] = [
      {
        id: 'w1',
        date: '2026-11-02',
        name: 'A',
        updatedAt: '',
        sets: [12, 12, 12].map((reps, i) => ({
          id: `s${i}`,
          exerciseId: bench.id,
          position: 0,
          setIndex: i,
          weightKg: 70,
          reps,
          rpe: 8,
        })),
      },
    ];
    expect(suggestWeight(bench, plan, workouts, estimates)).toEqual({
      weightKg: 72.5,
      source: 'history',
      decision: 'increase',
    });
  });

  it('вправи з власною вагою — без ваги', () => {
    expect(suggestWeight(getExercise('push_up')!, plan, [], estimates).source).toBe('none');
  });
});

describe('підсумок тренування', () => {
  it('рахує тоннаж і бере лише виконані підходи', () => {
    let n = 0;
    const sets = liveToSets(
      [
        {
          exerciseId: 'a',
          repsMin: 8,
          repsMax: 10,
          restSec: 90,
          targetRpe: 8,
          weightSource: 'none',
          sets: [
            { weightKg: 50, reps: 10, done: true },
            { weightKg: 50, reps: 8, done: true },
            { weightKg: 50, reps: 8, done: false },
          ],
        },
      ],
      () => `id${n++}`,
    );
    expect(sets).toHaveLength(2);
    expect(tonnageKg(sets)).toBe(900);
  });
});
