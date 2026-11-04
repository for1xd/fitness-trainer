export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export type FoodSource = 'ua_dish' | 'base' | 'off' | 'usda' | 'user' | 'ai';
export type EntrySource = 'manual' | 'barcode' | 'photo' | 'recipe';

export interface Nutrients {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface Portion {
  id: string;
  label: string;
  grams: number;
}

export interface Food {
  id: string;
  source: FoodSource;
  /** Стабільний ідентифікатор страви з вбудованої бази */
  slug?: string;
  name: string;
  brand?: string;
  category?: string;
  externalId?: string;
  barcode?: string;
  /** КБЖВ на 100 г */
  per100: Nutrients;
  portions: Portion[];
  updatedAt?: string;
}

export interface MealEntry {
  id: string;
  /** Локальна дата щоденника YYYY-MM-DD */
  date: string;
  eatenAt: string;
  mealType: MealType;
  foodId?: string;
  recipeId?: string;
  /** Знімок назви та КБЖВ на момент запису — щоденник не зміниться, якщо продукт відредагують. */
  name: string;
  grams: number;
  nutrients: Nutrients;
  source: EntrySource;
  /** Аналіз фото, з якого створено запис */
  photoAnalysisId?: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  id: string;
  foodId: string;
  name: string;
  grams: number;
  per100: Nutrients;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  /** Вага готової страви (після варіння/запікання). Без неї — сума сирих інгредієнтів. */
  cookedWeightG?: number;
  servings: number;
  updatedAt: string;
}
