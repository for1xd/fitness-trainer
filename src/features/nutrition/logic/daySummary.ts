import { MEAL_TYPES, type MealEntry, type MealType, type Nutrients } from '../types';
import { sumNutrients } from './nutrients';

export interface MealGroup {
  mealType: MealType;
  entries: MealEntry[];
  total: Nutrients;
}

export interface DaySummary {
  date: string;
  total: Nutrients;
  meals: MealGroup[];
}

export function summarizeDay(entries: MealEntry[], date: string): DaySummary {
  const ofDay = entries
    .filter((e) => e.date === date)
    .sort((a, b) => a.eatenAt.localeCompare(b.eatenAt));
  const meals = MEAL_TYPES.map((mealType) => {
    const list = ofDay.filter((e) => e.mealType === mealType);
    return { mealType, entries: list, total: sumNutrients(list.map((e) => e.nutrients)) };
  });
  return { date, total: sumNutrients(ofDay.map((e) => e.nutrients)), meals };
}

export type TargetNutrients = Nutrients;

/** Скільки лишилось з'їсти. Від'ємне значення — перевищення. */
export function remaining(target: TargetNutrients, eaten: Nutrients): Nutrients {
  const r = (a: number, b: number) => Math.round((a - b) * 10) / 10;
  return {
    kcal: r(target.kcal, eaten.kcal),
    proteinG: r(target.proteinG, eaten.proteinG),
    fatG: r(target.fatG, eaten.fatG),
    carbsG: r(target.carbsG, eaten.carbsG),
  };
}

/** Частка виконання 0…1 (для кілець); понад 1 — обрізається, перевищення видно окремо. */
export function progressShare(eaten: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(1, Math.max(0, eaten / target));
}

/** Прийом їжі за замовчуванням за годиною дня. */
export function defaultMealType(hour: number): MealType {
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}
