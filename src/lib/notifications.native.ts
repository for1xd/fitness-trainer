import * as Notifications from 'expo-notifications';

import type { PlannedNotification, ReminderType } from '@/features/reminders/logic';

export const notificationsSupported = true;

// Показуємо сповіщення й тоді, коли застосунок відкритий
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Перепланування: усі старі нагадування застосунку скасовуються, нові ставляться за планом. */
export async function applySchedule(
  plan: PlannedNotification[],
  texts: Record<ReminderType, { title: string; body: string }>,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      content: { title: texts[n.type].title, body: texts[n.type].body, data: { type: n.type } },
      trigger:
        n.weekday !== undefined
          ? {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: n.weekday,
              hour: n.hour,
              minute: n.minute,
            }
          : {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: n.hour,
              minute: n.minute,
            },
    });
  }
}
