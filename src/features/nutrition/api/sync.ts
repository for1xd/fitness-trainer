import type { Row } from '@/lib/sync/outbox';
import { registerSyncTable } from '@/lib/sync/registry';

import { useNutrition } from '../store';
import { foodFromRow, mealEntryFromRow, RECIPE_SELECT, recipeFromRow } from './rows';

const split = (rows: Row[]) => ({
  alive: rows.filter((r) => !r.deleted_at),
  deletedIds: rows.filter((r) => r.deleted_at).map((r) => String(r.id)),
});

// Власні продукти — раніше за рецепти й записи щоденника (зовнішні ключі)
registerSyncTable({
  table: 'foods',
  order: 10,
  owner: 'owner_id',
  select: '*, food_portions(id, label_uk, grams)',
  applyRemote: (rows) => {
    const { alive, deletedIds } = split(rows);
    useNutrition
      .getState()
      .applyRemote({ foods: alive.map(foodFromRow), deleted: { foods: deletedIds } });
  },
});

registerSyncTable({
  table: 'recipes',
  order: 20,
  owner: 'user_id',
  select: RECIPE_SELECT,
  // Рецепт і його інгредієнти: upsert рецептів, потім інгредієнти замінюються повністю
  push: async (client, rows) => {
    const recipes = rows.map(({ ingredients: _ingredients, ...rest }) => rest);
    const { error } = await client.from('recipes').upsert(recipes);
    if (error) return error.message;
    for (const row of rows) {
      const del = await client.from('recipe_ingredients').delete().eq('recipe_id', String(row.id));
      if (del.error) return del.error.message;
      const ingredients = (row.ingredients as Row[] | undefined) ?? [];
      if (!row.deleted_at && ingredients.length) {
        const ins = await client.from('recipe_ingredients').insert(ingredients);
        if (ins.error) return ins.error.message;
      }
    }
    return null;
  },
  applyRemote: (rows) => {
    const { alive, deletedIds } = split(rows);
    useNutrition
      .getState()
      .applyRemote({ recipes: alive.map(recipeFromRow), deleted: { recipes: deletedIds } });
  },
});

registerSyncTable({
  table: 'meal_entries',
  order: 30,
  owner: 'user_id',
  applyRemote: (rows) => {
    const { alive, deletedIds } = split(rows);
    useNutrition
      .getState()
      .applyRemote({ entries: alive.map(mealEntryFromRow), deleted: { entries: deletedIds } });
  },
});
