import type { Row } from '@/lib/sync/outbox';

import type { Food, MealEntry, Recipe } from '../types';

const n = (v: unknown) => Number(v ?? 0);
const s = (v: unknown) => (v === null || v === undefined ? undefined : String(v));

// ─────────── meal_entries ───────────
export const mealEntryToRow = (e: MealEntry, deletedAt?: string): Row & { id: string } => ({
  id: e.id,
  date: e.date,
  eaten_at: e.eatenAt,
  meal_type: e.mealType,
  food_id: e.foodId ?? null,
  recipe_id: e.recipeId ?? null,
  name: e.name,
  grams: e.grams,
  kcal: e.nutrients.kcal,
  protein_g: e.nutrients.proteinG,
  fat_g: e.nutrients.fatG,
  carbs_g: e.nutrients.carbsG,
  source: e.source,
  updated_at: e.updatedAt,
  deleted_at: deletedAt ?? null,
});

export const mealEntryFromRow = (r: Row): MealEntry => ({
  id: String(r.id),
  date: String(r.date),
  eatenAt: String(r.eaten_at),
  mealType: r.meal_type as MealEntry['mealType'],
  foodId: s(r.food_id),
  recipeId: s(r.recipe_id),
  name: String(r.name),
  grams: n(r.grams),
  nutrients: { kcal: n(r.kcal), proteinG: n(r.protein_g), fatG: n(r.fat_g), carbsG: n(r.carbs_g) },
  source: r.source as MealEntry['source'],
  updatedAt: String(r.updated_at),
});

// ─────────── foods (лише власні продукти користувача) ───────────
export const foodToRow = (f: Food, deletedAt?: string): Row & { id: string } => ({
  id: f.id,
  source: f.source,
  external_id: f.externalId ?? null,
  barcode: f.barcode ?? null,
  name_uk: f.name,
  brand: f.brand ?? null,
  kcal_100g: f.per100.kcal,
  protein_100g: f.per100.proteinG,
  fat_100g: f.per100.fatG,
  carbs_100g: f.per100.carbsG,
  updated_at: f.updatedAt ?? new Date().toISOString(),
  deleted_at: deletedAt ?? null,
});

export const foodFromRow = (r: Row): Food => ({
  id: String(r.id),
  source: r.source as Food['source'],
  externalId: s(r.external_id),
  barcode: s(r.barcode),
  name: String(r.name_uk),
  brand: s(r.brand),
  per100: {
    kcal: n(r.kcal_100g),
    proteinG: n(r.protein_100g),
    fatG: n(r.fat_100g),
    carbsG: n(r.carbs_100g),
  },
  portions: Array.isArray(r.food_portions)
    ? (r.food_portions as Row[]).map((p) => ({
        id: String(p.id),
        label: String(p.label_uk),
        grams: n(p.grams),
      }))
    : [],
  updatedAt: s(r.updated_at),
});

// ─────────── recipes + recipe_ingredients ───────────
/** Рядок рецепта з інгредієнтами; інгредієнти синхронізатор відправляє окремою таблицею. */
export const recipeToRow = (r: Recipe, deletedAt?: string): Row & { id: string } => ({
  id: r.id,
  name: r.name,
  cooked_weight_g: r.cookedWeightG ?? null,
  servings: r.servings,
  updated_at: r.updatedAt,
  deleted_at: deletedAt ?? null,
  ingredients: r.ingredients.map((i) => ({
    id: i.id,
    recipe_id: r.id,
    food_id: i.foodId,
    grams: i.grams,
  })),
});

export const RECIPE_SELECT =
  '*, recipe_ingredients(id, food_id, grams, foods(name_uk, kcal_100g, protein_100g, fat_100g, carbs_100g))';

export const recipeFromRow = (r: Row): Recipe => ({
  id: String(r.id),
  name: String(r.name),
  cookedWeightG:
    r.cooked_weight_g === null || r.cooked_weight_g === undefined
      ? undefined
      : n(r.cooked_weight_g),
  servings: n(r.servings) || 1,
  updatedAt: String(r.updated_at),
  ingredients: ((r.recipe_ingredients as Row[] | undefined) ?? []).map((i) => {
    const food = (i.foods ?? {}) as Row;
    return {
      id: String(i.id),
      foodId: String(i.food_id),
      grams: n(i.grams),
      name: String(food.name_uk ?? ''),
      per100: {
        kcal: n(food.kcal_100g),
        proteinG: n(food.protein_100g),
        fatG: n(food.fat_100g),
        carbsG: n(food.carbs_100g),
      },
    };
  }),
});
