import {
  formatTime,
  isoToExpoWeekday,
  parseTime,
  planNotifications,
  waterHours,
  type Reminder,
} from './logic';

const r = (type: Reminder['type'], enabled: boolean, hour: number, minute = 0): Reminder => ({
  id: type,
  type,
  enabled,
  hour,
  minute,
  updatedAt: '',
});

describe('нагадування', () => {
  it('вода кожні 2 години до 20:00', () => {
    expect(waterHours(10)).toEqual([10, 12, 14, 16, 18, 20]);
    expect(waterHours(21)).toEqual([]);
  });

  it('дні тижня: пн → 2, нд → 1 (нумерація Expo)', () => {
    expect([1, 3, 7].map(isoToExpoWeekday)).toEqual([2, 4, 1]);
  });

  it('розклад: лише увімкнені, тренування — у дні програми', () => {
    const plan = planNotifications(
      [
        r('water', false, 10),
        r('meal', true, 20, 30),
        r('workout', true, 18),
        r('weigh_in', true, 7, 30),
      ],
      [1, 4],
    );
    expect(plan).toEqual([
      { type: 'meal', hour: 20, minute: 30 },
      { type: 'workout', hour: 18, minute: 0, weekday: 2 },
      { type: 'workout', hour: 18, minute: 0, weekday: 5 },
      { type: 'weigh_in', hour: 7, minute: 30 },
    ]);
  });

  it('час: формат і розбір', () => {
    expect(formatTime(7, 5)).toBe('07:05');
    expect(parseTime('7:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseTime('19.00')).toEqual({ hour: 19, minute: 0 });
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime('abc')).toBeNull();
  });
});
