import { addDaysIso, parseIsoDate } from '@/lib/dates';

/** День тижня: 1 = понеділок … 7 = неділя. */
export function isoWeekday(iso: string): number {
  const d = parseIsoDate(iso).getDay();
  return d === 0 ? 7 : d;
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()) / 86400000);
}

interface Schedulable {
  startDate: string;
  weekdays: number[];
  days: { length: number } | unknown[];
}

/**
 * Індекс дня програми, запланованого на дату, або null (день відпочинку / до старту).
 * Дні йдуть по колу: для 3 днів з шаблонами A/B/A наступного тижня буде B/A/B.
 */
export function scheduledDayIndex(program: Schedulable, date: string): number | null {
  const count = (program.days as unknown[]).length;
  if (!count || date < program.startDate || !program.weekdays.includes(isoWeekday(date)))
    return null;
  let sessions = 0;
  for (let d = program.startDate; d < date; d = addDaysIso(d, 1)) {
    if (program.weekdays.includes(isoWeekday(d))) sessions += 1;
  }
  return sessions % count;
}

/** Номер тижня програми, починаючи з 1. */
export function programWeek(startDate: string, date: string): number {
  return Math.floor(daysBetween(startDate, date) / 7) + 1;
}

/** Сітка місяця для календаря: тижні з понеділка, дні з інших місяців — null. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Тиждень (пн–нд), що містить дату. */
export function weekOf(date: string): string[] {
  const monday = addDaysIso(date, 1 - isoWeekday(date));
  return Array.from({ length: 7 }, (_, i) => addDaysIso(monday, i));
}
