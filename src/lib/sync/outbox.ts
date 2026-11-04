/**
 * Черга змін для синхронізації з Supabase (офлайн-first).
 * Кожна зміна — повний рядок таблиці; для одного запису в черзі лишається лише остання версія.
 * Видалення — це upsert з deleted_at (м'яке видалення), тож інші пристрої теж дізнаються про нього.
 */

export type SyncTable =
  | 'profiles'
  | 'weight_entries'
  | 'nutrition_targets'
  | 'foods'
  | 'recipes'
  | 'meal_entries'
  | 'water_entries'
  | 'strength_estimates'
  | 'gyms'
  | 'programs'
  | 'workouts';

export type Row = Record<string, unknown>;

export interface OutboxOp {
  table: SyncTable;
  id: string;
  row: Row;
  queuedAt: number;
}

export function enqueueOp(queue: OutboxOp[], op: OutboxOp): OutboxOp[] {
  return [...queue.filter((q) => !(q.table === op.table && q.id === op.id)), op];
}

/** Прибирає з черги операції, які вже надіслано (якщо їх не замінили новішими під час відправки). */
export function removeSent(queue: OutboxOp[], sent: OutboxOp[]): OutboxOp[] {
  return queue.filter(
    (q) => !sent.some((s) => s.table === q.table && s.id === q.id && s.queuedAt === q.queuedAt),
  );
}

export interface Versioned {
  id: string;
  updatedAt?: string;
}

/**
 * Злиття з сервером за правилом «останній запис перемагає».
 * `deletedIds` — записи, видалені на сервері.
 */
export function mergeLww<T extends Versioned>(
  local: T[],
  remote: T[],
  deletedIds: string[] = [],
): T[] {
  const byId = new Map(local.map((x) => [x.id, x]));
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l || (r.updatedAt ?? '') > (l.updatedAt ?? '')) byId.set(r.id, r);
  }
  for (const id of deletedIds) byId.delete(id);
  return [...byId.values()];
}
