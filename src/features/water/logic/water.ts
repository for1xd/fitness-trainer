export const WATER_ML_PER_KG = { min: 30, default: 33, max: 35 } as const;
export const TRAINING_DAY_BONUS_ML = 500;

export interface WaterInput {
  weightKg: number;
  isTrainingDay?: boolean;
  /** 30–35 мл/кг; значення поза межами обрізаються. */
  mlPerKg?: number;
}

/** Денна норма води, округлена до 50 мл. */
export function dailyWaterMl({
  weightKg,
  isTrainingDay = false,
  mlPerKg = WATER_ML_PER_KG.default,
}: WaterInput): number {
  const perKg = Math.min(WATER_ML_PER_KG.max, Math.max(WATER_ML_PER_KG.min, mlPerKg));
  const total = weightKg * perKg + (isTrainingDay ? TRAINING_DAY_BONUS_ML : 0);
  return Math.round(total / 50) * 50;
}
