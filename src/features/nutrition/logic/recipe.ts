import type { Food, Nutrients, Recipe } from '../types';
import { per100FromTotal, scaleNutrients, sumNutrients } from './nutrients';

export interface RecipeTotals {
  total: Nutrients;
  rawWeightG: number;
  /** Вага готової страви, від якої рахується КБЖВ на 100 г. */
  finalWeightG: number;
  per100: Nutrients;
  servingG: number;
}

export function recipeTotals(
  recipe: Pick<Recipe, 'ingredients' | 'cookedWeightG' | 'servings'>,
): RecipeTotals {
  const total = sumNutrients(recipe.ingredients.map((i) => scaleNutrients(i.per100, i.grams)));
  const rawWeightG = recipe.ingredients.reduce((s, i) => s + i.grams, 0);
  const finalWeightG =
    recipe.cookedWeightG && recipe.cookedWeightG > 0 ? recipe.cookedWeightG : rawWeightG;
  const servings = Math.max(1, Math.round(recipe.servings));
  return {
    total,
    rawWeightG,
    finalWeightG,
    per100: per100FromTotal(total, finalWeightG),
    servingG: Math.round(finalWeightG / servings),
  };
}

/** Рецепт як продукт: щоб додавати його в щоденник так само, як страву з бази. */
export function recipeAsFood(recipe: Recipe, servingLabel: string): Food {
  const t = recipeTotals(recipe);
  return {
    id: recipe.id,
    source: 'user',
    name: recipe.name,
    per100: t.per100,
    portions:
      t.servingG > 0
        ? [{ id: `${recipe.id}:serving`, label: servingLabel, grams: t.servingG }]
        : [],
    updatedAt: recipe.updatedAt,
  };
}
