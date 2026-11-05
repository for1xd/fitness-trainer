import { SCHEMA_VERSION } from '@/lib/dataSchema';

import { buildEnvelope, MAX_IMPORT_BYTES, parseEnvelope } from './envelope';

describe('експорт / імпорт', () => {
  const env = buildEnvelope(
    { water: { entries: [], trainingDays: [] } },
    new Date('2026-11-05T10:00:00Z'),
  );

  it('експорт читається назад без змін', () => {
    const r = parseEnvelope(JSON.stringify(env));
    expect(r).toEqual({ ok: true, stores: { water: { entries: [], trainingDays: [] } } });
    expect(env.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('відхиляє не JSON, чужий формат і невідомі поля', () => {
    expect(parseEnvelope('{oops')).toEqual({ ok: false, error: 'notJson' });
    expect(parseEnvelope('{"a":1}')).toEqual({ ok: false, error: 'wrongFormat' });
    expect(parseEnvelope(JSON.stringify({ ...env, extra: 1 }))).toEqual({
      ok: false,
      error: 'wrongFormat',
    });
    expect(
      parseEnvelope(JSON.stringify({ ...env, stores: { ...env.stores, hacker: {} } })),
    ).toEqual({ ok: false, error: 'wrongFormat' });
  });

  it('відхиляє файл новішої версії і завеликий файл', () => {
    expect(parseEnvelope(JSON.stringify({ ...env, schemaVersion: SCHEMA_VERSION + 1 }))).toEqual({
      ok: false,
      error: 'newerVersion',
    });
    expect(parseEnvelope(' '.repeat(MAX_IMPORT_BYTES + 1))).toEqual({
      ok: false,
      error: 'tooLarge',
    });
  });
});
