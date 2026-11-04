import type { SupabaseClient } from '@supabase/supabase-js';

import type { Row, SyncTable } from './outbox';

export interface SyncTableConfig {
  table: SyncTable;
  /** Порядок відправки (менше — раніше): батьківські записи перед дочірніми для зовнішніх ключів. */
  order: number;
  /** Колонка власника, яку синхронізатор заповнює id користувача. */
  owner: 'user_id' | 'owner_id' | 'id';
  onConflict?: string;
  /** Колонки для завантаження з сервера (за замовчуванням '*'). */
  select?: string;
  /** Власна відправка (наприклад, рецепт разом з інгредієнтами). Повертає текст помилки або null. */
  push?: (client: SupabaseClient, rows: Row[]) => Promise<string | null>;
  /** Застосувати рядки з сервера до локального сховища. */
  applyRemote: (rows: Row[]) => void;
}

const tables = new Map<SyncTable, SyncTableConfig>();

export function registerSyncTable(config: SyncTableConfig): void {
  tables.set(config.table, config);
}

export function syncTables(): SyncTableConfig[] {
  return [...tables.values()].sort((a, b) => a.order - b.order);
}

export function syncTable(table: SyncTable): SyncTableConfig | undefined {
  return tables.get(table);
}
