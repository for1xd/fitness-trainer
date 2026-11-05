import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, versioned } from '@/lib/persistStorage';

import { enqueueOp, removeSent, type OutboxOp, type Row, type SyncTable } from './outbox';

interface OutboxState {
  queue: OutboxOp[];
  /** Остання мітка updated_at, отримана з сервера, по кожній таблиці. */
  pulledUntil: Partial<Record<SyncTable, string>>;
  enqueue: (table: SyncTable, row: Row & { id: string }) => void;
  markSent: (sent: OutboxOp[]) => void;
  setPulledUntil: (table: SyncTable, iso: string) => void;
  reset: () => void;
}

let flushListener: (() => void) | null = null;
/** Двигун синхронізації підписується, щоб відправляти зміни невдовзі після запису. */
export const onEnqueue = (fn: () => void) => {
  flushListener = fn;
};

export const useOutbox = create<OutboxState>()(
  persist(
    (set) => ({
      queue: [],
      pulledUntil: {},
      enqueue: (table, row) => {
        set((s) => ({
          queue: enqueueOp(s.queue, { table, id: row.id, row, queuedAt: Date.now() }),
        }));
        flushListener?.();
      },
      markSent: (sent) => set((s) => ({ queue: removeSent(s.queue, sent) })),
      setPulledUntil: (table, iso) =>
        set((s) => ({ pulledUntil: { ...s.pulledUntil, [table]: iso } })),
      reset: () => set({ queue: [], pulledUntil: {} }),
    }),
    { name: 'outbox', storage: persistStorage, ...versioned('outbox') },
  ),
);

/** Зручний виклик з будь-якого сховища: поставити рядок у чергу. */
export const queueRow = (table: SyncTable, row: Row & { id: string }) =>
  useOutbox.getState().enqueue(table, row);
