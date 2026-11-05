import { z } from 'zod';

import { migrateStore, SCHEMA_VERSION } from '@/lib/dataSchema';

/** Сховища, що входять в експорт (чернетки, черга синхронізації та сесія — ні). */
export const EXPORTED_STORES = [
  'profile',
  'settings',
  'nutrition',
  'water',
  'strength',
  'gym',
  'workouts',
  'progress',
  'reminders',
] as const;
export type ExportedStore = (typeof EXPORTED_STORES)[number];

export const APP_ID = 'fitness-trainer';
/** Межа розміру файлу імпорту: фото прогресу займають більшу частину. */
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

const storeState = z.record(z.string().max(64), z.unknown());

const envelopeSchema = z
  .object({
    app: z.literal(APP_ID),
    schemaVersion: z.number().int().min(0).max(SCHEMA_VERSION),
    exportedAt: z.string().max(40),
    stores: z
      .object(
        Object.fromEntries(EXPORTED_STORES.map((n) => [n, storeState.optional()])) as Record<
          ExportedStore,
          z.ZodOptional<typeof storeState>
        >,
      )
      .strict(),
  })
  .strict();

export interface Envelope {
  app: typeof APP_ID;
  schemaVersion: number;
  exportedAt: string;
  stores: Partial<Record<ExportedStore, Record<string, unknown>>>;
}

export function buildEnvelope(
  stores: Partial<Record<ExportedStore, Record<string, unknown>>>,
  now = new Date(),
): Envelope {
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), stores };
}

export type ImportError = 'tooLarge' | 'notJson' | 'wrongFormat' | 'newerVersion';

/**
 * Перевіряє файл імпорту: розмір, JSON, точна структура (невідомі поля відхиляються),
 * версія схеми; повертає стани сховищ, уже піднятих до поточної версії.
 */
export function parseEnvelope(
  text: string,
):
  | { ok: true; stores: Partial<Record<ExportedStore, Record<string, unknown>>> }
  | { ok: false; error: ImportError } {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'tooLarge' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'notJson' };
  }
  const version = (raw as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (typeof version === 'number' && version > SCHEMA_VERSION)
    return { ok: false, error: 'newerVersion' };
  const parsed = envelopeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'wrongFormat' };
  const stores: Partial<Record<ExportedStore, Record<string, unknown>>> = {};
  for (const name of EXPORTED_STORES) {
    const s = parsed.data.stores[name];
    if (s) stores[name] = migrateStore(name, s, parsed.data.schemaVersion);
  }
  return { ok: true, stores };
}
