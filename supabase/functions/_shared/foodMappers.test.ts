import { mapOffProduct, mapUsdaFood } from './foodMappers';

describe('mapOffProduct', () => {
  it('бере українську назву й КБЖВ на 100 г', () => {
    const f = mapOffProduct({
      code: '4820000000000',
      product_name: 'Kefir',
      product_name_uk: 'Кефір 2,5%',
      brands: 'Галичина, Other',
      serving_quantity: '200',
      nutriments: {
        'energy-kcal_100g': 50,
        proteins_100g: 2.8,
        fat_100g: 2.5,
        carbohydrates_100g: '4,0',
      },
    });
    expect(f).toEqual({
      source: 'off',
      externalId: '4820000000000',
      barcode: '4820000000000',
      name: 'Кефір 2,5%',
      brand: 'Галичина',
      per100: { kcal: 50, proteinG: 2.8, fatG: 2.5, carbsG: 4 },
      servingG: 200,
    });
  });

  it('переводить кДж у ккал, якщо ккал немає', () => {
    const f = mapOffProduct({
      code: '1',
      product_name: 'X',
      nutriments: {
        'energy-kj_100g': 418.4,
        proteins_100g: 1,
        fat_100g: 1,
        carbohydrates_100g: 20,
      },
    });
    expect(f?.per100.kcal).toBe(100);
  });

  it('відкидає продукти без назви, КБЖВ або з хибними даними', () => {
    expect(mapOffProduct({ code: '1', nutriments: {} })).toBeNull();
    expect(
      mapOffProduct({
        code: '1',
        product_name: 'Bad',
        nutriments: {
          'energy-kcal_100g': 2000,
          proteins_100g: 1,
          fat_100g: 1,
          carbohydrates_100g: 1,
        },
      }),
    ).toBeNull();
  });
});

describe('mapUsdaFood', () => {
  it('читає нутрієнти за номерами', () => {
    const f = mapUsdaFood({
      fdcId: 171705,
      description: 'Buckwheat groats, roasted, cooked',
      foodNutrients: [
        { nutrientNumber: '208', value: 92 },
        { nutrientNumber: '203', value: 3.38 },
        { nutrientNumber: '204', value: 0.62 },
        { nutrientNumber: '205', value: 19.94 },
      ],
    });
    expect(f).toMatchObject({
      source: 'usda',
      externalId: '171705',
      per100: { kcal: 92, proteinG: 3.4, fatG: 0.6, carbsG: 19.9 },
    });
  });

  it('рахує калорії з макросів, якщо енергії немає', () => {
    const f = mapUsdaFood({
      fdcId: 1,
      description: 'X',
      foodNutrients: [
        { nutrientNumber: '203', value: 10 },
        { nutrientNumber: '204', value: 10 },
        { nutrientNumber: '205', value: 10 },
      ],
    });
    expect(f?.per100.kcal).toBe(170);
  });
});
