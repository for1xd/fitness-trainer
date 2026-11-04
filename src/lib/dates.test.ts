import { addDaysIso, birthDateFromAge, toIsoDate } from './dates';

describe('dates', () => {
  it('додає дні через межу місяця й року', () => {
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('дата народження з віку', () => {
    expect(birthDateFromAge(30, new Date(2026, 10, 4))).toBe('1996-11-04');
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
