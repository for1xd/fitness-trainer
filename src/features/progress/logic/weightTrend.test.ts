import { latestTrendKg, shouldRecalculateTargets, weightTrend } from './weightTrend';

describe('weightTrend', () => {
  it('рахує 7-денне ковзне середнє', () => {
    const entries = [
      { date: '2026-11-01', weightKg: 80 },
      { date: '2026-11-02', weightKg: 81 },
      { date: '2026-11-03', weightKg: 79 },
    ];
    const trend = weightTrend(entries);
    expect(trend.map((p) => p.trendKg)).toEqual([80, 80.5, 80]);
  });

  it('сортує записи і не бере старі за межами вікна', () => {
    const entries = [
      { date: '2026-11-10', weightKg: 78 },
      { date: '2026-11-01', weightKg: 90 },
    ];
    const trend = weightTrend(entries);
    expect(trend[0]?.date).toBe('2026-11-01');
    expect(trend[1]?.trendKg).toBe(78);
  });

  it('latestTrendKg повертає null без даних', () => {
    expect(latestTrendKg([])).toBeNull();
  });
});

describe('shouldRecalculateTargets', () => {
  it('перераховує при зміні тренду на 1 кг і більше', () => {
    expect(shouldRecalculateTargets(79, 80)).toBe(true);
    expect(shouldRecalculateTargets(79.5, 80)).toBe(false);
    expect(shouldRecalculateTargets(81.2, 80)).toBe(true);
  });
});
