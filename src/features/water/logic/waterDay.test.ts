import { lastEntryOfDay, waterTotalMl, type WaterEntry } from './waterDay';

const e = (id: string, date: string, at: string, ml: number): WaterEntry => ({
  id,
  date,
  at,
  ml,
  updatedAt: at,
});

describe('water day', () => {
  const list = [
    e('a', '2026-11-04', '2026-11-04T08:00:00Z', 250),
    e('b', '2026-11-04', '2026-11-04T12:00:00Z', 500),
    e('c', '2026-11-03', '2026-11-03T12:00:00Z', 1000),
  ];
  it('сумує воду за день', () => {
    expect(waterTotalMl(list, '2026-11-04')).toBe(750);
  });
  it('знаходить останній запис дня', () => {
    expect(lastEntryOfDay(list, '2026-11-04')?.id).toBe('b');
    expect(lastEntryOfDay(list, '2026-11-05')).toBeUndefined();
  });
});
