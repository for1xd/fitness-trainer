import {
  calcAgeYears,
  calcBmr,
  calcTargets,
  calcTdee,
  macroReferenceWeightKg,
  type TargetsInput,
} from './nutrition';

const man: TargetsInput = {
  sex: 'male',
  ageYears: 30,
  heightCm: 180,
  weightKg: 80,
  activity: 'moderate',
  goal: 'maintain',
  pace: 'normal',
};

describe('calcBmr (Міффлін — Сан Жеор)', () => {
  it('чоловік 80 кг, 180 см, 30 років', () => {
    // 800 + 1125 − 150 + 5
    expect(calcBmr(man)).toBe(1780);
  });

  it('жінка 60 кг, 165 см, 25 років', () => {
    // 600 + 1031.25 − 125 − 161
    expect(calcBmr({ sex: 'female', weightKg: 60, heightCm: 165, ageYears: 25 })).toBeCloseTo(
      1345.25,
    );
  });
});

describe('calcTdee', () => {
  it('множить на коефіцієнт активності', () => {
    expect(calcTdee(1780, 'moderate')).toBeCloseTo(2759);
    expect(calcTdee(1000, 'sedentary')).toBe(1200);
    expect(calcTdee(1000, 'very_high')).toBe(1900);
  });
});

describe('calcAgeYears', () => {
  it('враховує, чи був день народження цього року', () => {
    const today = new Date(2026, 10, 4);
    expect(calcAgeYears(new Date(1996, 10, 4), today)).toBe(30);
    expect(calcAgeYears(new Date(1996, 10, 5), today)).toBe(29);
  });
});

describe('calcTargets', () => {
  it('підтримка: калорії ≈ TDEE, макроси сходяться з калоріями', () => {
    const t = calcTargets(man);
    expect(t.tdee).toBe(2759);
    expect(t.kcal).toBe(2760);
    expect(t.proteinG).toBe(144); // 1.8 × 80
    expect(t.fatG).toBeGreaterThanOrEqual(64); // ≥ 0.8 × 80
    const fromMacros = t.proteinG * 4 + t.fatG * 9 + t.carbsG * 4;
    expect(Math.abs(fromMacros - t.kcal)).toBeLessThan(15);
    expect(t.warnings).toEqual([]);
  });

  it('схуднення −15 % і більше білка', () => {
    const t = calcTargets({ ...man, goal: 'lose' });
    expect(t.adjustment).toBe(-0.15);
    expect(t.kcal).toBe(2350); // 2759 × 0.85 = 2345 → 2350
    expect(t.proteinG).toBe(160); // 2.0 × 80
    expect(t.expectedWeeklyChangeKg).toBeLessThan(0);
  });

  it('набір +10 %', () => {
    const t = calcTargets({ ...man, goal: 'gain' });
    expect(t.kcal).toBe(3030); // 2759 × 1.1 = 3034.9 → 3030
  });

  it('ніколи не опускається нижче безпечного мінімуму', () => {
    const t = calcTargets({
      sex: 'female',
      ageYears: 60,
      heightCm: 150,
      weightKg: 48,
      activity: 'sedentary',
      goal: 'lose',
      pace: 'fast',
    });
    expect(t.kcal).toBe(1200);
    expect(t.warnings).toContain('clamped_to_minimum');
  });

  it('мінімум для чоловіків — 1500', () => {
    const t = calcTargets({
      ...man,
      weightKg: 55,
      heightCm: 160,
      ageYears: 70,
      activity: 'sedentary',
      goal: 'lose',
      pace: 'fast',
    });
    expect(t.kcal).toBe(1500);
  });

  it('попереджає про швидкий темп', () => {
    expect(calcTargets({ ...man, goal: 'lose', pace: 'fast' }).warnings).toContain('fast_loss');
    expect(calcTargets({ ...man, goal: 'gain', pace: 'fast' }).warnings).toContain('fast_gain');
    expect(calcTargets({ ...man, goal: 'lose', pace: 'normal' }).warnings).not.toContain(
      'fast_loss',
    );
  });

  it('попереджає про схуднення при дефіциті ваги', () => {
    const t = calcTargets({ ...man, weightKg: 55, goal: 'lose', pace: 'slow' });
    expect(t.warnings).toContain('underweight_loss');
  });

  it('попереджає, якщо користувачу менше 18', () => {
    expect(calcTargets({ ...man, ageYears: 16 }).warnings).toContain('minor');
  });

  it("вуглеводи не бувають від'ємними, жири не нижче 0,8 г/кг", () => {
    const t = calcTargets({
      sex: 'female',
      ageYears: 55,
      heightCm: 160,
      weightKg: 64,
      activity: 'sedentary',
      goal: 'lose',
      pace: 'fast',
    });
    expect(t.carbsG).toBeGreaterThanOrEqual(0);
    expect(t.fatG).toBeGreaterThanOrEqual(Math.round(0.8 * 64));
  });

  it('при великій вазі білок рахується від ваги з ІМТ 25', () => {
    const t = calcTargets({ ...man, weightKg: 130, goal: 'lose' });
    expect(t.proteinG).toBe(162); // 2.0 × 81 кг
  });
});

describe('macroReferenceWeightKg', () => {
  it('не змінює вагу при ІМТ ≤ 27', () => {
    expect(macroReferenceWeightKg(80, 180)).toBe(80);
  });
  it('бере вагу з ІМТ 25 при ожирінні', () => {
    expect(macroReferenceWeightKg(130, 180)).toBeCloseTo(81);
  });
});
