import {
  applyKnownDishes,
  isConsistentMatch,
  buildSystemPrompt,
  MEAL_ANALYSIS_SCHEMA,
  sniffImageType,
  userPrompt,
  validateMealAnalysis,
  type KnownDish,
} from './mealAnalysis';

const borshch: KnownDish = {
  slug: 'borshch-ukrainskyi-z-miasom',
  name: "Борщ український з м'ясом",
  per100: { kcal: 57, proteinG: 3.1, fatG: 2.9, carbsG: 5 },
};

const raw = {
  is_food: true,
  dish_name_uk: 'Борщ зі сметаною',
  items: [
    {
      name_uk: 'Борщ',
      match_slug: borshch.slug,
      grams: 350,
      kcal: 180,
      protein_g: 9,
      fat_g: 8,
      carbs_g: 18,
      confidence: 0.82,
    },
    {
      name_uk: 'Сметана',
      match_slug: null,
      grams: 30,
      kcal: 62,
      protein_g: 0.8,
      fat_g: 6,
      carbs_g: 1,
      confidence: 0.6,
    },
  ],
  overall_confidence: 0.7,
  notes_uk: "Шматки м'яса частково приховані.",
};

describe('schema', () => {
  it("усі об'єкти закриті (additionalProperties: false) — вимога structured outputs", () => {
    expect(MEAL_ANALYSIS_SCHEMA.additionalProperties).toBe(false);
    expect(MEAL_ANALYSIS_SCHEMA.properties.items.items.additionalProperties).toBe(false);
    expect(JSON.stringify(MEAL_ANALYSIS_SCHEMA)).not.toMatch(/minimum|maximum|minLength/);
  });
});

describe('prompt', () => {
  it('містить список відомих страв зі slug', () => {
    const p = buildSystemPrompt([borshch]);
    expect(p).toContain("borshch-ukrainskyi-z-miasom | Борщ український з м'ясом | 57");
  });
  it('додає й обрізає підказку користувача', () => {
    expect(userPrompt('  борщ   зі сметаною ')).toMatch(
      /Підказка від користувача: борщ зі сметаною$/,
    );
    expect(userPrompt()).not.toMatch(/Підказка/);
    expect(userPrompt('x'.repeat(500)).length).toBeLessThan(300);
  });
});

describe('validateMealAnalysis', () => {
  it('приводить відповідь до внутрішнього формату', () => {
    const a = validateMealAnalysis(raw, new Set([borshch.slug]))!;
    expect(a.isFood).toBe(true);
    expect(a.items).toHaveLength(2);
    expect(a.items[0]).toMatchObject({ matchSlug: borshch.slug, grams: 350, confidence: 0.8 });
  });

  it('обмежує значення та відкидає невідомі slug', () => {
    const a = validateMealAnalysis(
      {
        ...raw,
        overall_confidence: 7,
        items: [{ ...raw.items[0], match_slug: 'made-up', grams: 99999, kcal: -5, confidence: 3 }],
      },
      new Set([borshch.slug]),
    )!;
    expect(a.overallConfidence).toBe(1);
    expect(a.items[0]).toMatchObject({ matchSlug: null, grams: 3000, kcal: 0, confidence: 1 });
  });

  it('пропускає зіпсовані елементи й відкидає зіпсовану відповідь', () => {
    expect(
      validateMealAnalysis({ ...raw, items: [{ name_uk: '', grams: 10, kcal: 1 }, 5] })?.items,
    ).toEqual([]);
    expect(validateMealAnalysis(null)).toBeNull();
    expect(validateMealAnalysis({ is_food: 'yes', items: [] })).toBeNull();
  });

  it('не їжа — порожній список', () => {
    const a = validateMealAnalysis({ ...raw, is_food: false })!;
    expect(a.isFood).toBe(false);
    expect(a.items).toEqual([]);
  });
});

describe('applyKnownDishes', () => {
  it('для впізнаної страви бере КБЖВ з бази', () => {
    const a = applyKnownDishes(validateMealAnalysis(raw)!, new Map([[borshch.slug, borshch]]));
    expect(a.items[0]).toMatchObject({ name: borshch.name, kcal: 199.5, proteinG: 10.9 });
    expect(a.items[1]?.kcal).toBe(62); // невпізнана — як оцінила модель
  });

  it('відкидає збіг, якщо оцінка моделі далека від бази (інший варіант страви)', () => {
    // Вершковий суп з лососем: модель — 85 ккал/100 г, «Юшка рибна» в базі — 45
    const yushka: KnownDish = {
      slug: 'yushka-rybna',
      name: 'Юшка рибна',
      per100: { kcal: 45, proteinG: 4.5, fatG: 1.8, carbsG: 2.9 },
    };
    const soup = {
      ...raw,
      items: [
        {
          ...raw.items[0],
          name_uk: 'Вершковий суп з лососем',
          match_slug: yushka.slug,
          grams: 350,
          kcal: 298,
        },
      ],
    };
    const a = applyKnownDishes(validateMealAnalysis(soup)!, new Map([[yushka.slug, yushka]]));
    expect(a.items[0]).toMatchObject({
      name: 'Вершковий суп з лососем',
      matchSlug: null,
      kcal: 298,
    });
  });

  it('isConsistentMatch: ±25 % від бази', () => {
    expect(isConsistentMatch({ kcal: 57 * 3.5 * 1.3, grams: 350 }, borshch)).toBe(true);
    expect(isConsistentMatch({ kcal: 57 * 3.5 * 1.4, grams: 350 }, borshch)).toBe(false);
    expect(isConsistentMatch({ kcal: 57 * 3.5 * 0.7, grams: 350 }, borshch)).toBe(false);
  });
});

describe('sniffImageType', () => {
  it('визначає формат за сигнатурою', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe('image/png');
    expect(sniffImageType(new Uint8Array([0x47, 0x49, 0x46]))).toBeNull();
  });
});
