import type { Profile, WeightRecord } from '../types';
import { buildTargets, trendWeightForRecalc, upsertWeight } from './buildTargets';

const profile: Profile = {
  sex: 'male',
  birthDate: '1996-01-01',
  heightCm: 180,
  activity: 'moderate',
  goal: 'lose',
  pace: 'normal',
};

const w = (date: string, weightKg: number): WeightRecord => ({ id: date, date, weightKg });

describe('buildTargets', () => {
  it('рахує вік з дати народження і додає норму води', () => {
    const t = buildTargets(profile, 80, 'onboarding', {
      id: 'x',
      validFrom: '2026-11-04',
      today: new Date(2026, 10, 4),
    });
    expect(t.bmr).toBe(1780); // 30 років
    expect(t.waterMl).toBe(2650);
    expect(t.weightKg).toBe(80);
    expect(t.reason).toBe('onboarding');
  });
});

describe('trendWeightForRecalc', () => {
  const current = buildTargets(profile, 80, 'onboarding', { id: 'x', validFrom: '2026-11-01' });

  it('не перераховує через одне зважування з невеликим відхиленням', () => {
    expect(trendWeightForRecalc([w('2026-11-01', 80), w('2026-11-02', 79.2)], current)).toBeNull();
  });

  it('перераховує, коли тренд змістився на 1 кг', () => {
    const weights = [w('2026-11-20', 79), w('2026-11-21', 78.8), w('2026-11-22', 79.1)];
    expect(trendWeightForRecalc(weights, current)).toBe(79);
  });

  it('без норм нічого не повертає', () => {
    expect(trendWeightForRecalc([w('2026-11-01', 70)], null)).toBeNull();
  });
});

describe('upsertWeight', () => {
  it('замінює запис за ту саму дату і сортує', () => {
    const list = upsertWeight([w('2026-11-02', 80), w('2026-11-01', 81)], w('2026-11-02', 79.5));
    expect(list.map((e) => e.weightKg)).toEqual([81, 79.5]);
  });
});
