import type { AnalyzedItem } from '../../../../supabase/functions/_shared/mealAnalysis';
import type { Food, Nutrients } from '../types';
import { per100FromTotal, scaleNutrients, sumNutrients } from './nutrients';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export const confidenceLevel = (c: number): ConfidenceLevel =>
  c >= 0.75 ? 'high' : c >= 0.5 ? 'medium' : 'low';

/** Позиція на екрані перевірки: вагу можна змінити, КБЖВ перераховується від «на 100 г». */
export interface ReviewItem {
  key: string;
  name: string;
  grams: number;
  per100: Nutrients;
  /** Продукт з бази, якщо страву впізнано — тоді запис посилається на нього */
  food?: Food;
  confidence: number;
}

export function toReviewItems(
  items: AnalyzedItem[],
  seedBySlug: (slug: string) => Food | undefined,
): ReviewItem[] {
  return items.map((item, i) => {
    const food = item.matchSlug ? seedBySlug(item.matchSlug) : undefined;
    const per100 = food
      ? food.per100
      : per100FromTotal(
          { kcal: item.kcal, proteinG: item.proteinG, fatG: item.fatG, carbsG: item.carbsG },
          item.grams,
        );
    return {
      key: `${i}-${item.name}`,
      name: food?.name ?? item.name,
      grams: item.grams,
      per100,
      food,
      confidence: item.confidence,
    };
  });
}

export const reviewItemNutrients = (item: Pick<ReviewItem, 'per100' | 'grams'>) =>
  scaleNutrients(item.per100, item.grams);

export const reviewTotal = (items: ReviewItem[]) => sumNutrients(items.map(reviewItemNutrients));
