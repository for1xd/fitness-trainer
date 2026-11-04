export type ReminderType = 'water' | 'meal' | 'workout' | 'weigh_in';
export const REMINDER_TYPES: ReminderType[] = ['water', 'meal', 'workout', 'weigh_in'];

export interface Reminder {
  id: string;
  type: ReminderType;
  enabled: boolean;
  hour: number;
  minute: number;
  updatedAt: string;
}

export const DEFAULT_TIMES: Record<ReminderType, [number, number]> = {
  water: [10, 0],
  meal: [20, 30],
  workout: [18, 0],
  weigh_in: [7, 30],
};

/** Вода: кожні 2 години від обраного часу до 20:00. */
export function waterHours(startHour: number, lastHour = 20, every = 2): number[] {
  const out: number[] = [];
  for (let h = Math.max(0, startHour); h <= lastHour; h += every) out.push(h);
  return out;
}

/** День тижня для сповіщень: у Expo 1 = неділя, у застосунку 1 = понеділок. */
export const isoToExpoWeekday = (iso: number) => (iso % 7) + 1;

export interface PlannedNotification {
  type: ReminderType;
  hour: number;
  minute: number;
  /** День тижня в нумерації Expo; немає — щодня */
  weekday?: number;
}

/** Розклад сповіщень з налаштувань і днів тренувань програми. */
export function planNotifications(
  reminders: Reminder[],
  trainingWeekdays: number[],
): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  for (const r of reminders) {
    if (!r.enabled) continue;
    if (r.type === 'water') {
      for (const hour of waterHours(r.hour)) out.push({ type: 'water', hour, minute: r.minute });
    } else if (r.type === 'workout') {
      for (const d of trainingWeekdays) {
        out.push({ type: 'workout', hour: r.hour, minute: r.minute, weekday: isoToExpoWeekday(d) });
      }
    } else {
      out.push({ type: r.type, hour: r.hour, minute: r.minute });
    }
  }
  return out;
}

export const formatTime = (hour: number, minute: number) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

export function parseTime(text: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(text.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}
