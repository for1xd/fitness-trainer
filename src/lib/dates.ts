const pad = (n: number) => String(n).padStart(2, '0');

/** Локальна дата у форматі YYYY-MM-DD. */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayIso = () => toIsoDate(new Date());

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Дата народження для заданого віку (той самий день і місяць, що сьогодні). */
export function birthDateFromAge(ageYears: number, today: Date = new Date()): string {
  return toIsoDate(new Date(today.getFullYear() - ageYears, today.getMonth(), today.getDate()));
}
