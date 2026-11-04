import type { MealEntry } from '@/features/nutrition/types';
import type { Workout } from '@/features/workouts/types';

import {
  muscleSets,
  niceTicks,
  oneRmSeries,
  setBin,
  weeklyReport,
  weeklyTonnage,
  weightSeries,
} from './stats';

const workout = (date: string, sets: [string, number, number][]): Workout => ({
  id: date,
  date,
  name: 'W',
  updatedAt: '',
  sets: sets.map(([exerciseId, weightKg, reps], i) => ({
    id: `${date}${i}`,
    exerciseId,
    position: 0,
    setIndex: i,
    weightKg,
    reps,
  })),
});

describe('niceTicks', () => {
  it('рівні поділки', () => {
    expect(niceTicks(78.3, 82.6)).toEqual([78, 80, 82, 84]);
    expect(niceTicks(78.3, 82.6, 8)).toEqual([78, 79, 80, 81, 82, 83]);
    expect(niceTicks(0, 9200)).toEqual([0, 2500, 5000, 7500, 10000]);
  });
  it('один рівень — запас з обох боків', () => {
    expect(niceTicks(80, 80)).toEqual([79, 80, 81]);
  });
});

describe('weightSeries', () => {
  it('бере період, але тренд рахує з усієї історії', () => {
    const s = weightSeries(
      [
        { date: '2026-10-30', weightKg: 90 },
        { date: '2026-11-03', weightKg: 80 },
      ],
      '2026-11-04',
      3,
    );
    expect(s).toHaveLength(1);
    expect(s[0]?.trendKg).toBe(85); // 90 з-поза періоду в 7-денному вікні
  });
});

describe("тоннаж і м'язи", () => {
  const ws = [
    workout('2026-11-02', [
      ['barbell_bench_press', 60, 10],
      ['barbell_bench_press', 60, 8],
    ]),
    workout('2026-10-27', [['barbell_back_squat', 100, 5]]),
  ];
  it('тоннаж по тижнях з понеділка', () => {
    expect(weeklyTonnage(ws, '2026-11-04', 3)).toEqual([
      { weekStart: '2026-10-19', value: 0 },
      { weekStart: '2026-10-26', value: 500 },
      { weekStart: '2026-11-02', value: 1080 },
    ]);
  });
  it("підходи на м'яз: основний 1, допоміжні 0,5", () => {
    const m = muscleSets(ws, '2026-11-02');
    expect(m.chest).toBe(2);
    expect(m.triceps).toBe(1);
    expect(m.quads).toBeUndefined();
  });
  it('кошики теплової карти', () => {
    expect([0, 0.5, 4, 5, 12, 25].map(setBin)).toEqual([0, 1, 1, 2, 3, 4]);
  });
});

describe('oneRmSeries', () => {
  it('найбільше значення за день, по датах', () => {
    expect(
      oneRmSeries(
        [
          { exerciseId: 'a', oneRmKg: 100, date: '2026-11-02' },
          { exerciseId: 'a', oneRmKg: 102, date: '2026-11-02' },
          { exerciseId: 'b', oneRmKg: 50, date: '2026-11-01' },
          { exerciseId: 'a', oneRmKg: 95, date: '2026-10-20' },
        ],
        'a',
      ),
    ).toEqual([
      { date: '2026-10-20', value: 95 },
      { date: '2026-11-02', value: 102 },
    ]);
  });
});

describe('weeklyReport', () => {
  const entry = (date: string, kcal: number, proteinG: number): MealEntry => ({
    id: date + kcal,
    date,
    eatenAt: date,
    mealType: 'lunch',
    name: 'x',
    grams: 100,
    nutrients: { kcal, proteinG, fatG: 0, carbsG: 0 },
    source: 'manual',
    updatedAt: '',
  });
  it('рахує дні, воду, тренування і зміну ваги', () => {
    const r = weeklyReport({
      weekStart: '2026-11-02',
      today: '2026-11-04',
      entries: [entry('2026-11-02', 2000, 150), entry('2026-11-03', 2400, 100)],
      water: [{ id: 'w', date: '2026-11-02', at: '', ml: 3000, updatedAt: '' }],
      waterTargetMl: () => 2650,
      workouts: [workout('2026-11-02', [['barbell_bench_press', 60, 10]])],
      program: { startDate: '2026-11-02', weekdays: [1, 3, 5], days: [{}, {}] } as never,
      weights: [
        { date: '2026-10-31', weightKg: 82 },
        { date: '2026-11-04', weightKg: 81 },
      ],
      targets: { kcal: 2300, proteinG: 160 },
    });
    expect(r).toMatchObject({
      daysLogged: 2,
      avgKcal: 2200,
      proteinDaysHit: 1, // 150 г ≥ 90 % від 160 г
      waterDaysHit: 1,
      workoutsDone: 1,
      workoutsPlanned: 3,
      tonnageKg: 600,
      weightChangeKg: -0.5,
    });
  });
});
