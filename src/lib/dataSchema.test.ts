import { __setMigrationForTest, migrateStore, SCHEMA_VERSION } from './dataSchema';

describe('migrateStore', () => {
  it('поточна версія — без змін', () => {
    expect(migrateStore('water', { entries: [1] }, SCHEMA_VERSION)).toEqual({ entries: [1] });
  });

  it('застосовує крок міграції зі старої версії', () => {
    __setMigrationForTest('water', 0, (s) => ({ ...s, trainingDays: s.trainingDays ?? [] }));
    expect(migrateStore('water', { entries: [] }, 0)).toEqual({ entries: [], trainingDays: [] });
    __setMigrationForTest('water', 0, null);
  });

  it('пошкоджений стан стає порожнім обʼєктом', () => {
    expect(migrateStore('water', null, 0)).toEqual({});
    expect(migrateStore('water', [1, 2], 0)).toEqual({});
  });
});
