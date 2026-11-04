import { getExercise } from '@/features/catalog/data';
import type { MealEntry } from '@/features/nutrition/types';
import type { WaterEntry } from '@/features/water/logic/waterDay';
import { scheduledDayIndex, weekOf } from '@/features/workouts/logic/schedule';
import { tonnageKg } from '@/features/workouts/logic/summary';
import type { Program, Workout } from '@/features/workouts/types';
import { addDaysIso } from '@/lib/dates';

import { weightTrend, type WeightEntry } from './weightTrend';

export { niceTicks } from '@/lib/ticks';

export interface TrendPointOut {
  date: string;
  weightKg: number;
  trendKg: number;
}

/** Вага й тренд за останні `days` днів (тренд рахується з повної історії, щоб початок не «скакав»). */
export function weightSeries(entries: WeightEntry[], today: string, days: number): TrendPointOut[] {
  const from = addDaysIso(today, -(days - 1));
  return weightTrend(entries).filter((p) => p.date >= from && p.date <= today);
}

export interface WeekBucket {
  weekStart: string;
  value: number;
}

/** Тоннаж по тижнях (пн–нд), останні `weeks` тижнів, включно з поточним. */
export function weeklyTonnage(workouts: Workout[], today: string, weeks: number): WeekBucket[] {
  const thisMonday = weekOf(today)[0]!;
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDaysIso(thisMonday, -7 * (weeks - 1 - i));
    const weekEnd = addDaysIso(weekStart, 6);
    const value = workouts
      .filter((w) => w.date >= weekStart && w.date <= weekEnd)
      .reduce((s, w) => s + tonnageKg(w.sets), 0);
    return { weekStart, value };
  });
}

/**
 * Робочі підходи на м'яз за тиждень: основний м'яз — 1, допоміжні — 0,5.
 * Орієнтир для росту м'язів — 10–20 підходів на тиждень.
 */
export function muscleSets(workouts: Workout[], weekStart: string): Record<string, number> {
  const weekEnd = addDaysIso(weekStart, 6);
  const out: Record<string, number> = {};
  for (const w of workouts) {
    if (w.date < weekStart || w.date > weekEnd) continue;
    for (const s of w.sets) {
      const e = getExercise(s.exerciseId);
      if (!e) continue;
      out[e.primary_muscle_id] = (out[e.primary_muscle_id] ?? 0) + 1;
      for (const m of e.secondary_muscle_ids) out[m] = (out[m] ?? 0) + 0.5;
    }
  }
  return out;
}

/** Кошики теплової карти: 0, 1–4, 5–9, 10–19, 20+ підходів на тиждень. */
export const SET_BINS = [0, 1, 5, 10, 20] as const;
export function setBin(sets: number): number {
  if (sets <= 0) return 0;
  if (sets < 5) return 1;
  if (sets < 10) return 2;
  if (sets < 20) return 3;
  return 4;
}

/** Історія 1ПМ: найбільше значення за кожен день. */
export function oneRmSeries(
  history: { exerciseId: string; oneRmKg: number; date: string }[],
  exerciseId: string,
): { date: string; value: number }[] {
  const byDay = new Map<string, number>();
  for (const h of history) {
    if (h.exerciseId !== exerciseId) continue;
    byDay.set(h.date, Math.max(byDay.get(h.date) ?? 0, h.oneRmKg));
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

export interface WeeklyReport {
  weekStart: string;
  daysLogged: number;
  avgKcal: number | null;
  kcalTarget: number;
  proteinDaysHit: number;
  waterDaysHit: number;
  workoutsDone: number;
  workoutsPlanned: number;
  tonnageKg: number;
  /** Зміна тренду ваги за тиждень, кг; null — замало зважувань */
  weightChangeKg: number | null;
}

/** Підсумок тижня (пн–нд) за харчуванням, водою, тренуваннями й вагою. */
export function weeklyReport(params: {
  weekStart: string;
  today: string;
  entries: MealEntry[];
  water: WaterEntry[];
  waterTargetMl: (date: string) => number;
  workouts: Workout[];
  program: Program | null;
  weights: WeightEntry[];
  targets: { kcal: number; proteinG: number };
}): WeeklyReport {
  const { weekStart, today, entries, water, workouts, program, weights, targets } = params;
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i)).filter(
    (d) => d <= today,
  );

  let kcalSum = 0;
  let daysLogged = 0;
  let proteinDaysHit = 0;
  let waterDaysHit = 0;
  for (const d of days) {
    const ofDay = entries.filter((e) => e.date === d);
    if (ofDay.length) {
      daysLogged += 1;
      kcalSum += ofDay.reduce((s, e) => s + e.nutrients.kcal, 0);
      const protein = ofDay.reduce((s, e) => s + e.nutrients.proteinG, 0);
      if (protein >= targets.proteinG * 0.9) proteinDaysHit += 1;
    }
    const ml = water.filter((w) => w.date === d).reduce((s, w) => s + w.ml, 0);
    if (ml >= params.waterTargetMl(d)) waterDaysHit += 1;
  }

  const weekEnd = addDaysIso(weekStart, 6);
  const ofWeek = workouts.filter((w) => w.date >= weekStart && w.date <= weekEnd);
  const workoutsPlanned = program
    ? Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i)).filter(
        (d) => scheduledDayIndex(program, d) !== null,
      ).length
    : 0;

  const trend = weightTrend(weights);
  const before = trend.filter((p) => p.date < weekStart).at(-1);
  const inWeek = trend.filter((p) => p.date >= weekStart && p.date <= weekEnd).at(-1);
  const weightChangeKg =
    before && inWeek ? Math.round((inWeek.trendKg - before.trendKg) * 10) / 10 : null;

  return {
    weekStart,
    daysLogged,
    avgKcal: daysLogged ? Math.round(kcalSum / daysLogged) : null,
    kcalTarget: targets.kcal,
    proteinDaysHit,
    waterDaysHit,
    workoutsDone: ofWeek.length,
    workoutsPlanned,
    tonnageKg: ofWeek.reduce((s, w) => s + tonnageKg(w.sets), 0),
    weightChangeKg,
  };
}
