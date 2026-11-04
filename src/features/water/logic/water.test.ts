import { dailyWaterMl } from './water';

describe('dailyWaterMl', () => {
  it('33 мл/кг за замовчуванням, округлення до 50 мл', () => {
    expect(dailyWaterMl({ weightKg: 80 })).toBe(2650); // 2640 → 2650
  });

  it('додає 500 мл у тренувальний день', () => {
    expect(dailyWaterMl({ weightKg: 80, isTrainingDay: true })).toBe(3150);
  });

  it('обмежує мл/кг діапазоном 30–35', () => {
    expect(dailyWaterMl({ weightKg: 100, mlPerKg: 50 })).toBe(3500);
    expect(dailyWaterMl({ weightKg: 100, mlPerKg: 10 })).toBe(3000);
  });
});
