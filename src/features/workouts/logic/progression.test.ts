import {
  deloadSets,
  isDeloadWeek,
  nextSessionWeight,
  roundToIncrement,
  workingWeightKg,
} from './progression';

const sets = (reps: number[], rpe?: number) => reps.map((r) => ({ targetReps: 8, reps: r, rpe }));

describe('workingWeightKg', () => {
  it('гіпертрофія: середина 65–80 % від 1ПМ', () => {
    expect(workingWeightKg(100, 'hypertrophy')).toBe(72.5);
  });
  it('сила: 85 %', () => {
    expect(workingWeightKg(140, 'strength')).toBe(120);
  });
  it('свій відсоток і крок тренажера', () => {
    expect(workingWeightKg(100, 'endurance', 5, 0.55)).toBe(55);
  });
});

describe('roundToIncrement', () => {
  it('округлює до кроку', () => {
    expect(roundToIncrement(73.4)).toBe(72.5);
    expect(roundToIncrement(73.8)).toBe(75);
  });
});

describe('nextSessionWeight', () => {
  it('+2,5 кг для верху, якщо все виконано з RPE ≤ 8', () => {
    expect(
      nextSessionWeight({ currentWeightKg: 60, region: 'upper', sets: sets([8, 8, 8], 8) }),
    ).toEqual({ weightKg: 62.5, decision: 'increase' });
  });

  it('+5 кг для низу', () => {
    expect(
      nextSessionWeight({ currentWeightKg: 100, region: 'lower', sets: sets([8, 8, 8], 7) })
        .weightKg,
    ).toBe(105);
  });

  it('повтор ваги, якщо було важко', () => {
    expect(
      nextSessionWeight({ currentWeightKg: 60, region: 'upper', sets: sets([8, 8, 8], 9.5) }),
    ).toEqual({ weightKg: 60, decision: 'repeat' });
  });

  it('перший провал — повтор, другий поспіль — зниження', () => {
    expect(
      nextSessionWeight({ currentWeightKg: 80, region: 'upper', sets: sets([8, 8, 6]) }).decision,
    ).toBe('repeat');
    expect(
      nextSessionWeight({
        currentWeightKg: 80,
        region: 'upper',
        sets: sets([8, 7, 6]),
        previousFailures: 1,
      }),
    ).toEqual({ weightKg: 75, decision: 'decrease' });
  });
});

describe('deload', () => {
  it('кожен 5-й тиждень за замовчуванням', () => {
    expect([1, 2, 3, 4, 5, 10].map((w) => isDeloadWeek(w))).toEqual([
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
  });
  it('інтервал обмежено 4–6 тижнями', () => {
    expect(isDeloadWeek(4, 2)).toBe(true);
    expect(isDeloadWeek(6, 10)).toBe(true);
  });
  it('обсяг −40 %', () => {
    expect(deloadSets(4)).toBe(2);
    expect(deloadSets(5)).toBe(3);
    expect(deloadSets(1)).toBe(1);
  });
});
