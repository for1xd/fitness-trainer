/** Рівні поділки осі: 0 / 5 / 10 замість 0 / 4,3 / 8,6. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!(max > min)) {
    const v = Number.isFinite(min) ? min : 0;
    return [v - 1, v, v + 1];
  }
  const raw = (max - min) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}
