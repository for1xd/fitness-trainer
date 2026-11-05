import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, versioned } from '@/lib/persistStorage';
import type { Row } from '@/lib/sync/outbox';
import { registerSyncTable } from '@/lib/sync/registry';
import { queueRow } from '@/lib/sync/store';

import {
  DEFAULT_TIMES,
  formatTime,
  REMINDER_TYPES,
  type Reminder,
  type ReminderType,
} from './logic';

interface RemindersState {
  reminders: Record<ReminderType, Reminder>;
  update: (
    type: ReminderType,
    patch: Partial<Pick<Reminder, 'enabled' | 'hour' | 'minute'>>,
  ) => void;
  applyRemote: (rows: Row[]) => void;
}

const initial = (): Record<ReminderType, Reminder> =>
  Object.fromEntries(
    REMINDER_TYPES.map((type) => [
      type,
      {
        id: randomUUID(),
        type,
        enabled: false,
        hour: DEFAULT_TIMES[type][0],
        minute: DEFAULT_TIMES[type][1],
        updatedAt: '',
      },
    ]),
  ) as Record<ReminderType, Reminder>;

const toRow = (r: Reminder): Row & { id: string } => ({
  id: r.id,
  type: r.type,
  time_of_day: `${formatTime(r.hour, r.minute)}:00`,
  enabled: r.enabled,
  updated_at: r.updatedAt,
});

export const useReminders = create<RemindersState>()(
  persist(
    (set, get) => ({
      reminders: initial(),
      update: (type, patch) => {
        const next = { ...get().reminders[type], ...patch, updatedAt: new Date().toISOString() };
        set((s) => ({ reminders: { ...s.reminders, [type]: next } }));
        queueRow('reminders', toRow(next));
      },
      applyRemote: (rows) =>
        set((s) => {
          const reminders = { ...s.reminders };
          for (const r of rows) {
            const type = r.type as ReminderType;
            const local = reminders[type];
            if (!local || String(r.updated_at) <= local.updatedAt) continue;
            const [h, m] = String(r.time_of_day).split(':').map(Number);
            reminders[type] = {
              id: String(r.id),
              type,
              enabled: Boolean(r.enabled),
              hour: h ?? local.hour,
              minute: m ?? local.minute,
              updatedAt: String(r.updated_at),
            };
          }
          return { reminders };
        }),
    }),
    { name: 'reminders', storage: persistStorage, ...versioned('reminders') },
  ),
);

registerSyncTable({
  table: 'reminders',
  order: 30,
  owner: 'user_id',
  applyRemote: (rows) => useReminders.getState().applyRemote(rows),
});
