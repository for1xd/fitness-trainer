import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { SEED_FOODS, seedFoodById } from './data/foods';
import { recipeAsFood } from './logic/recipe';
import { useNutrition } from './store';
import type { Food } from './types';

/** Усі продукти для пошуку: власні рецепти, власні продукти, вбудована база. */
export function useCatalog(): Food[] {
  const { t } = useTranslation();
  const userFoods = useNutrition((s) => s.userFoods);
  const recipes = useNutrition((s) => s.recipes);
  return useMemo(
    () => [
      ...recipes.map((r) => recipeAsFood(r, t('recipe.serving'))),
      ...userFoods,
      ...SEED_FOODS,
    ],
    [recipes, userFoods, t],
  );
}

export function useFoodById(id: string | undefined): { food: Food | undefined; isRecipe: boolean } {
  const { t } = useTranslation();
  const userFoods = useNutrition((s) => s.userFoods);
  const recipes = useNutrition((s) => s.recipes);
  return useMemo(() => {
    if (!id) return { food: undefined, isRecipe: false };
    const recipe = recipes.find((r) => r.id === id);
    if (recipe) return { food: recipeAsFood(recipe, t('recipe.serving')), isRecipe: true };
    return { food: userFoods.find((f) => f.id === id) ?? seedFoodById(id), isRecipe: false };
  }, [id, recipes, userFoods, t]);
}

/** Нещодавно додані продукти (унікальні), найсвіжіші — першими. */
export function useRecentFoods(limit = 8): Food[] {
  const entries = useNutrition((s) => s.entries);
  const catalog = useCatalog();
  return useMemo(() => {
    const byId = new Map(catalog.map((f) => [f.id, f]));
    const seen = new Set<string>();
    const out: Food[] = [];
    for (const e of [...entries].sort((a, b) => b.eatenAt.localeCompare(a.eatenAt))) {
      const id = e.recipeId ?? e.foodId;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const food = byId.get(id);
      if (food) out.push(food);
      if (out.length >= limit) break;
    }
    return out;
  }, [entries, catalog, limit]);
}
