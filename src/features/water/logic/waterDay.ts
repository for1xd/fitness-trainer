export interface WaterEntry {
  id: string;
  date: string;
  at: string;
  ml: number;
  updatedAt: string;
}

export const QUICK_ADD_ML = [250, 500] as const;
export const MAX_SINGLE_ML = 3000;

export function waterTotalMl(entries: WaterEntry[], date: string): number {
  return entries.filter((e) => e.date === date).reduce((s, e) => s + e.ml, 0);
}

/** Останній запис дня — для кнопки «Скасувати». */
export function lastEntryOfDay(entries: WaterEntry[], date: string): WaterEntry | undefined {
  return entries
    .filter((e) => e.date === date)
    .sort((a, b) => a.at.localeCompare(b.at))
    .at(-1);
}
