export interface WeightEntry {
  /** Дата у форматі YYYY-MM-DD */
  date: string;
  weightKg: number;
}

export interface TrendPoint extends WeightEntry {
  trendKg: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);

/**
 * Ковзне середнє за останні `windowDays` днів (включно з поточним).
 * Згладжує коливання води, щоб норми не перераховувались через одне зважування.
 */
export function weightTrend(entries: WeightEntry[], windowDays = 7): TrendPoint[] {
  const sorted = [...entries].sort((a, b) => toTime(a.date) - toTime(b.date));
  return sorted.map((entry) => {
    const end = toTime(entry.date);
    const window = sorted.filter((e) => {
      const t = toTime(e.date);
      return t <= end && t > end - windowDays * DAY_MS;
    });
    const avg = window.reduce((sum, e) => sum + e.weightKg, 0) / window.length;
    return { ...entry, trendKg: Math.round(avg * 10) / 10 };
  });
}

export function latestTrendKg(entries: WeightEntry[], windowDays = 7): number | null {
  const trend = weightTrend(entries, windowDays);
  return trend.at(-1)?.trendKg ?? null;
}

/** Перерахунок норм, коли тренд відійшов від ваги останнього розрахунку на ≥ поріг. */
export function shouldRecalculateTargets(
  trendKg: number,
  weightAtLastCalcKg: number,
  thresholdKg = 1,
): boolean {
  return Math.abs(trendKg - weightAtLastCalcKg) >= thresholdKg;
}
