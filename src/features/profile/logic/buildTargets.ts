import { calcAgeYears, calcTargets } from '@/features/onboarding/logic/nutrition';
import { latestTrendKg, shouldRecalculateTargets } from '@/features/progress/logic/weightTrend';
import { dailyWaterMl } from '@/features/water/logic/water';
import { parseIsoDate } from '@/lib/dates';

import type { Profile, TargetsReason, TargetsRecord, WeightRecord } from '../types';

export function buildTargets(
  profile: Profile,
  weightKg: number,
  reason: TargetsReason,
  meta: { id: string; validFrom: string; today?: Date },
): TargetsRecord {
  const targets = calcTargets({
    ...profile,
    ageYears: calcAgeYears(parseIsoDate(profile.birthDate), meta.today),
    weightKg,
  });
  return {
    ...targets,
    id: meta.id,
    validFrom: meta.validFrom,
    weightKg,
    waterMl: dailyWaterMl({ weightKg }),
    reason,
  };
}

/** Повертає вагу тренду, якщо вона відійшла від ваги розрахунку настільки, що норми слід оновити. */
export function trendWeightForRecalc(
  weights: WeightRecord[],
  current: TargetsRecord | null,
): number | null {
  const trend = latestTrendKg(weights);
  if (trend === null || !current) return null;
  return shouldRecalculateTargets(trend, current.weightKg) ? trend : null;
}

/** Вставляє або замінює запис ваги за дату. */
export function upsertWeight(weights: WeightRecord[], entry: WeightRecord): WeightRecord[] {
  const rest = weights.filter((w) => w.date !== entry.date);
  return [...rest, entry].sort((a, b) => a.date.localeCompare(b.date));
}
