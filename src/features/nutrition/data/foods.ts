import seed from '../../../../supabase/seed/foods.json';
import type { Food, FoodSource } from '../types';

interface SeedFood {
  id: string;
  slug: string;
  source: string;
  category: string;
  name_uk: string;
  kcal_100g: number;
  protein_100g: number;
  fat_100g: number;
  carbs_100g: number;
  portions: { id: string; label_uk: string; grams: number }[];
}

/**
 * Вбудована база: українські страви та базові продукти (ті самі id, що й у supabase/seed.sql).
 * Працює офлайн і без акаунта.
 */
export const SEED_FOODS: Food[] = (seed as SeedFood[]).map((f) => ({
  id: f.id,
  source: f.source as FoodSource,
  category: f.category,
  name: f.name_uk,
  per100: {
    kcal: f.kcal_100g,
    proteinG: f.protein_100g,
    fatG: f.fat_100g,
    carbsG: f.carbs_100g,
  },
  portions: f.portions.map((p) => ({ id: p.id, label: p.label_uk, grams: p.grams })),
}));

const byId = new Map(SEED_FOODS.map((f) => [f.id, f]));
export const seedFoodById = (id: string) => byId.get(id);
