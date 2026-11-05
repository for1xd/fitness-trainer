import { createJSONStorage } from 'zustand/middleware';

import { hybridStorage } from './cloud/storage';
import { migrateStore, SCHEMA_VERSION } from './dataSchema';

/**
 * Сховище для zustand persist: база артефакта (якщо є) + локальний кеш
 * (AsyncStorage на телефоні, localStorage у браузері).
 */
export const persistStorage = createJSONStorage(() => hybridStorage);

/** Версія схеми і міграції для persist-опцій сховища `name`. */
export const versioned = (name: string) => ({
  version: SCHEMA_VERSION,
  migrate: (state: unknown, fromVersion: number) => migrateStore(name, state, fromVersion),
});
