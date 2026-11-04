import type { Food, MealEntry, Recipe } from '../types';
import { defaultMealType, progressShare, remaining, summarizeDay } from './daySummary';
import { per100FromTotal, scaleNutrients, sumNutrients } from './nutrients';
import { recipeAsFood, recipeTotals } from './recipe';
import { matchScore, normalize, searchFoods, stem } from './search';

const per100 = { kcal: 200, proteinG: 10, fatG: 5, carbsG: 30 };

describe('nutrients', () => {
  it('масштабує КБЖВ на вагу', () => {
    expect(scaleNutrients(per100, 250)).toEqual({
      kcal: 500,
      proteinG: 25,
      fatG: 12.5,
      carbsG: 75,
    });
  });
  it('сумує і рахує обернено на 100 г', () => {
    const total = sumNutrients([scaleNutrients(per100, 150), scaleNutrients(per100, 50)]);
    expect(total.kcal).toBe(400);
    expect(per100FromTotal(total, 200)).toEqual(per100);
    expect(per100FromTotal(total, 0).kcal).toBe(0);
  });
});

const entry = (over: Partial<MealEntry>): MealEntry => ({
  id: Math.random().toString(),
  date: '2026-11-04',
  eatenAt: '2026-11-04T08:00:00Z',
  mealType: 'breakfast',
  name: 'x',
  grams: 100,
  nutrients: { kcal: 100, proteinG: 5, fatG: 2, carbsG: 10 },
  source: 'manual',
  updatedAt: '2026-11-04T08:00:00Z',
  ...over,
});

describe('summarizeDay', () => {
  it('групує за прийомами їжі й рахує лише вибраний день', () => {
    const s = summarizeDay(
      [entry({}), entry({ mealType: 'lunch' }), entry({ date: '2026-11-03' })],
      '2026-11-04',
    );
    expect(s.total.kcal).toBe(200);
    expect(s.meals.map((m) => m.entries.length)).toEqual([1, 1, 0, 0]);
  });

  it("залишок може бути від'ємним, частка кільця обрізана до 1", () => {
    const left = remaining(
      { kcal: 2000, proteinG: 150, fatG: 60, carbsG: 200 },
      {
        kcal: 2100,
        proteinG: 100,
        fatG: 60,
        carbsG: 250,
      },
    );
    expect(left).toEqual({ kcal: -100, proteinG: 50, fatG: 0, carbsG: -50 });
    expect(progressShare(2100, 2000)).toBe(1);
    expect(progressShare(500, 2000)).toBe(0.25);
    expect(progressShare(10, 0)).toBe(0);
  });

  it('прийом їжі за замовчуванням за часом', () => {
    expect([7, 13, 19, 23].map(defaultMealType)).toEqual(['breakfast', 'lunch', 'dinner', 'snack']);
  });
});

describe('recipe', () => {
  const recipe: Recipe = {
    id: 'r1',
    name: 'Гречка з куркою',
    servings: 2,
    updatedAt: '',
    ingredients: [
      {
        id: 'a',
        foodId: 'f1',
        name: 'Гречка суха',
        grams: 100,
        per100: { kcal: 313, proteinG: 12.6, fatG: 3.3, carbsG: 57.1 },
      },
      {
        id: 'b',
        foodId: 'f2',
        name: 'Куряче філе',
        grams: 200,
        per100: { kcal: 113, proteinG: 23.6, fatG: 1.9, carbsG: 0.4 },
      },
    ],
  };

  it('рахує загальне КБЖВ і на 100 г від сирої ваги', () => {
    const t = recipeTotals(recipe);
    expect(t.total.kcal).toBe(539);
    expect(t.rawWeightG).toBe(300);
    expect(t.per100.kcal).toBeCloseTo(179.7, 1);
    expect(t.servingG).toBe(150);
  });

  it('враховує вагу готової страви (уварювання / набухання)', () => {
    const t = recipeTotals({ ...recipe, cookedWeightG: 500 });
    expect(t.per100.kcal).toBeCloseTo(107.8, 1);
    expect(t.servingG).toBe(250);
  });

  it('рецепт як продукт має порцію', () => {
    const f = recipeAsFood(recipe, 'порція');
    expect(f.portions[0]).toMatchObject({ label: 'порція', grams: 150 });
  });
});

describe('search', () => {
  const food = (name: string, source: Food['source'] = 'ua_dish'): Food => ({
    id: name,
    name,
    source,
    per100,
    portions: [],
  });
  const foods = [
    food('Вареники з картоплею'),
    food('Вареники з вишнями'),
    food("Борщ український з м'ясом"),
    food('Борщ зелений зі щавлем і яйцем'),
    food('Картопля варена'),
    food('Куряче філе сире', 'base'),
  ];

  it('нормалізує апострофи та регістр', () => {
    expect(normalize('М’ясо  По-Французьки')).toBe("м'ясо по французьки");
  });

  it('відкидає закінчення', () => {
    expect(stem('вареників')).toBe('вареник');
    expect(stem('борщу')).toBe('борщ');
    expect(stem('суп')).toBe('суп'); // коротке слово — без змін
    expect(stem('котлети')).toBe('котлет');
  });

  it('знаходить за початком слова й з іншими закінченнями', () => {
    expect(searchFoods(foods, 'варен').map((f) => f.name)).toEqual([
      'Вареники з вишнями',
      'Вареники з картоплею',
      'Картопля варена',
    ]);
    expect(searchFoods(foods, 'вареників з картоплею')[0]?.name).toBe('Вареники з картоплею');
    expect(searchFoods(foods, "м'ясо борщ")[0]?.name).toBe("Борщ український з м'ясом");
  });

  it('не знаходить зайвого', () => {
    expect(matchScore('Борщ пісний', 'вареники')).toBeNull();
    expect(searchFoods(foods, '   ')).toEqual([]);
  });
});
