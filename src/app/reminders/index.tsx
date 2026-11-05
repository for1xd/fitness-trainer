import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, View } from 'react-native';

import {
  formatTime,
  parseTime,
  REMINDER_TYPES,
  type ReminderType,
} from '@/features/reminders/logic';
import { useReminders } from '@/features/reminders/store';
import { ensureNotificationPermission, notificationsSupported } from '@/lib/notifications';
import { useTheme } from '@/theme/ThemeProvider';
import { Header, Notice, Screen, Text, TextField } from '@/ui';

export default function RemindersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const reminders = useReminders((s) => s.reminders);
  const update = useReminders((s) => s.update);
  const [denied, setDenied] = useState(false);
  const [times, setTimes] = useState<Record<ReminderType, string>>(
    () =>
      Object.fromEntries(
        REMINDER_TYPES.map((k) => [k, formatTime(reminders[k].hour, reminders[k].minute)]),
      ) as Record<ReminderType, string>,
  );

  const toggle = async (type: ReminderType, enabled: boolean) => {
    if (enabled && !(await ensureNotificationPermission())) {
      setDenied(true);
      return;
    }
    setDenied(false);
    update(type, { enabled });
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('reminders.title')} />
      <Text variant="body" className="-mt-2 text-muted">
        {t('reminders.intro')}
      </Text>
      {!notificationsSupported ? <Notice text={t('reminders.webOnly')} /> : null}
      {denied ? <Notice tone="warn" text={t('reminders.denied')} /> : null}

      {REMINDER_TYPES.map((type) => {
        const r = reminders[type];
        const parsed = parseTime(times[type]);
        return (
          <View key={type} className="gap-3 rounded-card border border-hairline bg-surface p-4">
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text variant="heading">{t(`reminders.types.${type}.title`)}</Text>
                <Text variant="caption">{t(`reminders.types.${type}.desc`)}</Text>
              </View>
              <Switch
                accessibilityLabel={t(`reminders.types.${type}.title`)}
                value={r.enabled}
                disabled={!notificationsSupported}
                onValueChange={(v) => void toggle(type, v)}
                trackColor={{ true: colors.ink, false: colors.line }}
                thumbColor={colors.raised}
              />
            </View>
            {r.enabled ? (
              <TextField
                label={`${t(`reminders.types.${type}.title`)}, ${t('reminders.time').toLowerCase()}`}
                value={times[type]}
                onChangeText={(v) => {
                  setTimes((s) => ({ ...s, [type]: v }));
                  const p = parseTime(v);
                  if (p) update(type, p);
                }}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                hint={t('reminders.timeHint')}
                error={parsed ? undefined : t('reminders.invalidTime')}
              />
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}
