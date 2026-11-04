import type { PlannedNotification, ReminderType } from '@/features/reminders/logic';

/** Веб: локальні сповіщення за розкладом браузер не підтримує — нагадування працюють у застосунку на телефоні. */
export const notificationsSupported = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  return false;
}

export async function applySchedule(
  _plan: PlannedNotification[],
  _texts: Record<ReminderType, { title: string; body: string }>,
): Promise<void> {}
