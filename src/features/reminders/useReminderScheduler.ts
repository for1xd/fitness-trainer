import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useWorkouts } from '@/features/workouts/store';
import { applySchedule, notificationsSupported } from '@/lib/notifications';

import { planNotifications, REMINDER_TYPES, type ReminderType } from './logic';
import { useReminders } from './store';

/** Перепланування сповіщень при зміні налаштувань, днів тренувань або мови. Викликати один раз у корені. */
export function useReminderScheduler() {
  const { t } = useTranslation();
  const reminders = useReminders((s) => s.reminders);
  const weekdays = useWorkouts((s) => s.program?.weekdays);

  useEffect(() => {
    if (!notificationsSupported) return;
    const anyEnabled = Object.values(reminders).some((r) => r.enabled);
    const texts = Object.fromEntries(
      REMINDER_TYPES.map((k) => [
        k,
        { title: t(`reminders.types.${k}.notif`), body: t(`reminders.types.${k}.notifBody`) },
      ]),
    ) as Record<ReminderType, { title: string; body: string }>;
    void applySchedule(
      anyEnabled ? planNotifications(Object.values(reminders), weekdays ?? []) : [],
      texts,
    );
  }, [reminders, weekdays, t]);
}
