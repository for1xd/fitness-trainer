import type { Nutrients } from '../types';

export const ZERO: Nutrients = { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 };

const r1 = (n: number) => Math.round(n * 10) / 10;

/** КБЖВ для заданої ваги з КБЖВ на 100 г. */
export function scaleNutrients(per100: Nutrients, grams: number): Nutrients {
  const k = grams / 100;
  return {
    kcal: r1(per100.kcal * k),
    proteinG: r1(per100.proteinG * k),
    fatG: r1(per100.fatG * k),
    carbsG: r1(per100.carbsG * k),
  };
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  const total = list.reduce(
    (acc, n) => ({
      kcal: acc.kcal + n.kcal,
      proteinG: acc.proteinG + n.proteinG,
      fatG: acc.fatG + n.fatG,
      carbsG: acc.carbsG + n.carbsG,
    }),
    ZERO,
  );
  return {
    kcal: r1(total.kcal),
    proteinG: r1(total.proteinG),
    fatG: r1(total.fatG),
    carbsG: r1(total.carbsG),
  };
}

/** Обернене до scaleNutrients: КБЖВ на 100 г за сумарними значеннями і вагою. */
export function per100FromTotal(total: Nutrients, grams: number): Nutrients {
  if (grams <= 0) return ZERO;
  return scaleNutrients(total, (100 * 100) / grams);
}
