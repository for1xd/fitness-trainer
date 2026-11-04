import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { mergeLww } from '@/lib/sync/outbox';
import { queueRow } from '@/lib/sync/store';
import { persistStorage } from '@/lib/persistStorage';

import { foodToRow, mealEntryToRow, recipeToRow } from './api/rows';
import { scaleNutrients } from './logic/nutrients';
import type { EntrySource, Food, MealEntry, MealType, Recipe } from './types';

export interface NewEntry {
  food: Food;
  /** Якщо продукт — це рецепт користувача */
  isRecipe?: boolean;
  grams: number;
  mealType: MealType;
  date: string;
  source?: EntrySource;
  /** Продукт не з бази (напр. оцінка з фото) — запис зберігає лише знімок КБЖВ */
  detached?: boolean;
  photoAnalysisId?: string;
}

interface NutritionState {
  entries: MealEntry[];
  /** Власні продукти і збережені з Open Food Facts / USDA */
  userFoods: Food[];
  recipes: Recipe[];

  addEntry: (input: NewEntry) => MealEntry;
  updateEntry: (id: string, patch: { grams: number; mealType: MealType; food: Food }) => void;
  deleteEntry: (id: string) => void;

  /** Зберігає продукт користувача; для зовнішніх баз повертає вже збережений, якщо такий є. */
  saveFood: (food: Omit<Food, 'id'> & { id?: string }) => Food;
  saveRecipe: (recipe: Omit<Recipe, 'id' | 'updatedAt'> & { id?: string }) => Recipe;
  deleteRecipe: (id: string) => void;

  applyRemote: (data: {
    entries?: MealEntry[];
    foods?: Food[];
    recipes?: Recipe[];
    deleted?: { entries?: string[]; foods?: string[]; recipes?: string[] };
  }) => void;
  reset: () => void;
}

const now = () => new Date().toISOString();

export const useNutrition = create<NutritionState>()(
  persist(
    (set, get) => ({
      entries: [],
      userFoods: [],
      recipes: [],

      addEntry: ({
        food,
        isRecipe,
        grams,
        mealType,
        date,
        source = 'manual',
        detached,
        photoAnalysisId,
      }) => {
        const entry: MealEntry = {
          id: randomUUID(),
          date,
          eatenAt: now(),
          mealType,
          foodId: isRecipe || detached ? undefined : food.id,
          recipeId: isRecipe && !detached ? food.id : undefined,
          name: food.brand ? `${food.name} (${food.brand})` : food.name,
          grams,
          nutrients: scaleNutrients(food.per100, grams),
          source: isRecipe ? 'recipe' : source,
          photoAnalysisId,
          updatedAt: now(),
        };
        set((s) => ({ entries: [...s.entries, entry] }));
        queueRow('meal_entries', mealEntryToRow(entry));
        return entry;
      },

      updateEntry: (id, { grams, mealType, food }) => {
        const current = get().entries.find((e) => e.id === id);
        if (!current) return;
        const next: MealEntry = {
          ...current,
          grams,
          mealType,
          nutrients: scaleNutrients(food.per100, grams),
          updatedAt: now(),
        };
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? next : e)) }));
        queueRow('meal_entries', mealEntryToRow(next));
      },

      deleteEntry: (id) => {
        const current = get().entries.find((e) => e.id === id);
        if (!current) return;
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
        const stamp = now();
        queueRow('meal_entries', mealEntryToRow({ ...current, updatedAt: stamp }, stamp));
      },

      saveFood: (input) => {
        if (input.externalId) {
          const existing = get().userFoods.find(
            (f) => f.source === input.source && f.externalId === input.externalId,
          );
          if (existing) return existing;
        }
        const food: Food = { ...input, id: input.id ?? randomUUID(), updatedAt: now() };
        set((s) => ({ userFoods: [...s.userFoods.filter((f) => f.id !== food.id), food] }));
        queueRow('foods', foodToRow(food));
        return food;
      },

      saveRecipe: (input) => {
        const recipe: Recipe = { ...input, id: input.id ?? randomUUID(), updatedAt: now() };
        set((s) => ({ recipes: [...s.recipes.filter((r) => r.id !== recipe.id), recipe] }));
        queueRow('recipes', recipeToRow(recipe));
        return recipe;
      },

      deleteRecipe: (id) => {
        const current = get().recipes.find((r) => r.id === id);
        if (!current) return;
        set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) }));
        const stamp = now();
        queueRow('recipes', recipeToRow({ ...current, updatedAt: stamp }, stamp));
      },

      applyRemote: ({ entries = [], foods = [], recipes = [], deleted = {} }) =>
        set((s) => ({
          entries: mergeLww(s.entries, entries, deleted.entries),
          userFoods: mergeLww(s.userFoods, foods, deleted.foods),
          recipes: mergeLww(s.recipes, recipes, deleted.recipes),
        })),

      reset: () => set({ entries: [], userFoods: [], recipes: [] }),
    }),
    {
      name: 'nutrition',
      storage: persistStorage,
      partialize: (s) => ({ entries: s.entries, userFoods: s.userFoods, recipes: s.recipes }),
    },
  ),
);
