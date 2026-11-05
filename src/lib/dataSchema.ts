/**
 * Версія схеми збережених даних. Збільшуй, коли змінюється форма стану будь-якого сховища,
 * і додай крок міграції нижче — тоді старі збереження (локальні, в базі, в експорті) оновляться.
 */
export const SCHEMA_VERSION = 1;

type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/**
 * MIGRATIONS[сховище][з версії] → стан наступної версії.
 * 0 → 1: перша версія зі схемою; форма даних не змінилася.
 */
const MIGRATIONS: Record<string, Record<number, Migration>> = {};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Піднімає стан сховища `name` з версії `fromVersion` до поточної. */
export function migrateStore(
  name: string,
  state: unknown,
  fromVersion: number,
): Record<string, unknown> {
  let s = isRecord(state) ? state : {};
  for (let v = Math.max(0, fromVersion); v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[name]?.[v];
    if (step) s = step(s);
  }
  return s;
}

/** Лише для тестів: тимчасово додати крок міграції. */
export function __setMigrationForTest(name: string, from: number, step: Migration | null) {
  MIGRATIONS[name] ??= {};
  if (step) MIGRATIONS[name][from] = step;
  else delete MIGRATIONS[name][from];
}
