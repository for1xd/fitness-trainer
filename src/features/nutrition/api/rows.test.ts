import type { MealEntry, Recipe } from '../types';
import { mealEntryFromRow, mealEntryToRow, recipeFromRow, recipeToRow } from './rows';

describe('рядки таблиць', () => {
  it('запис щоденника: туди й назад без втрат', () => {
    const e: MealEntry = {
      id: 'e1',
      date: '2026-11-04',
      eatenAt: '2026-11-04T08:00:00.000Z',
      mealType: 'lunch',
      foodId: 'f1',
      name: 'Борщ',
      grams: 300,
      nutrients: { kcal: 171, proteinG: 9.3, fatG: 8.7, carbsG: 15 },
      source: 'manual',
      updatedAt: '2026-11-04T08:00:00.000Z',
    };
    const row = mealEntryToRow(e);
    expect(row).toMatchObject({
      meal_type: 'lunch',
      protein_g: 9.3,
      recipe_id: null,
      deleted_at: null,
    });
    // Supabase повертає numeric як рядки — перевіряємо перетворення
    expect(mealEntryFromRow({ ...row, grams: '300', kcal: '171' })).toEqual(e);
    expect(mealEntryToRow(e, '2026-11-05T00:00:00Z').deleted_at).toBe('2026-11-05T00:00:00Z');
  });

  it('рецепт: інгредієнти з вкладеними продуктами', () => {
    const recipe: Recipe = {
      id: 'r1',
      name: 'Каша',
      servings: 2,
      updatedAt: 'u',
      ingredients: [
        {
          id: 'i1',
          foodId: 'f1',
          name: 'Гречка',
          grams: 100,
          per100: { kcal: 313, proteinG: 12.6, fatG: 3.3, carbsG: 57.1 },
        },
      ],
    };
    const row = recipeToRow(recipe);
    expect(row.ingredients).toEqual([{ id: 'i1', recipe_id: 'r1', food_id: 'f1', grams: 100 }]);
    const fromServer = recipeFromRow({
      ...row,
      recipe_ingredients: [
        {
          id: 'i1',
          food_id: 'f1',
          grams: 100,
          foods: {
            name_uk: 'Гречка',
            kcal_100g: 313,
            protein_100g: 12.6,
            fat_100g: 3.3,
            carbs_100g: 57.1,
          },
        },
      ],
    });
    expect(fromServer).toEqual(recipe);
  });
});
