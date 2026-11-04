import { SEED_FOODS } from '../data/foods';
import { isUkrainianBarcode, isValidBarcode, normalizeBarcode } from './barcode';
import { confidenceLevel, reviewItemNutrients, reviewTotal, toReviewItems } from './photoReview';

describe('штрихкоди', () => {
  it('перевіряє контрольну цифру EAN-13, EAN-8, UPC-A', () => {
    expect(isValidBarcode('4006381333931')).toBe(true); // EAN-13
    expect(isValidBarcode('4006381333932')).toBe(false);
    expect(isValidBarcode('96385074')).toBe(true); // EAN-8
    expect(isValidBarcode('036000291452')).toBe(true); // UPC-A
    expect(isValidBarcode('123')).toBe(false);
  });
  it('нормалізує ручний ввід', () => {
    expect(normalizeBarcode(' 4006-3813 33931 ')).toBe('4006381333931');
    expect(isValidBarcode('4006 3813 3393 1')).toBe(true);
  });
  it('впізнає українські товари (482)', () => {
    expect(isUkrainianBarcode('4820000000000')).toBe(true);
    expect(isUkrainianBarcode('4006381333931')).toBe(false);
  });
});

describe('перевірка фото', () => {
  const bySlug = (slug: string) => SEED_FOODS.find((f) => f.slug === slug);

  it('впізнана страва бере КБЖВ з бази, невпізнана — з оцінки моделі', () => {
    const items = toReviewItems(
      [
        {
          name: 'Борщ',
          matchSlug: 'borshch-ukrainskyi-z-miasom',
          grams: 300,
          kcal: 999,
          proteinG: 1,
          fatG: 1,
          carbsG: 1,
          confidence: 0.8,
        },
        {
          name: 'Сметана',
          matchSlug: null,
          grams: 20,
          kcal: 40,
          proteinG: 0.6,
          fatG: 4,
          carbsG: 0.6,
          confidence: 0.6,
        },
      ],
      bySlug,
    );
    expect(items[0]?.food?.name).toBe("Борщ український з м'ясом");
    expect(reviewItemNutrients(items[0]!).kcal).toBe(171);
    expect(items[1]?.per100.kcal).toBe(200);
    // Зміна ваги перераховує КБЖВ пропорційно
    expect(reviewItemNutrients({ ...items[1]!, grams: 40 }).kcal).toBe(80);
    expect(reviewTotal(items).kcal).toBe(211);
  });

  it('рівні впевненості', () => {
    expect([0.9, 0.6, 0.3].map(confidenceLevel)).toEqual(['high', 'medium', 'low']);
  });
});
