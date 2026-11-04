import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { DaySummaryCard } from '@/features/nutrition/components/DaySummaryCard';
import { MealSection } from '@/features/nutrition/components/MealSection';
import { summarizeDay } from '@/features/nutrition/logic/daySummary';
import { useNutrition } from '@/features/nutrition/store';
import { useProfile } from '@/features/profile/store';
import { addDaysIso, parseIsoDate, todayIso } from '@/lib/dates';
import { formatLongDate } from '@/lib/format';
import { Button, IconButton, Screen, Text } from '@/ui';

export default function NutritionScreen() {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayIso());
  const entries = useNutrition((s) => s.entries);
  const targets = useProfile((s) => s.targets);
  const summary = useMemo(() => summarizeDay(entries, date), [entries, date]);

  if (!targets) return null;

  const today = todayIso();
  const dateLabel =
    date === today
      ? t('common.today')
      : date === addDaysIso(today, -1)
        ? t('common.yesterday')
        : formatLongDate(parseIsoDate(date));

  return (
    <Screen>
      <View className="flex-row items-center gap-1">
        <Text variant="title" className="flex-1">
          {t('nutrition.title')}
        </Text>
        <IconButton
          icon="chevron-left"
          label={t('common.prevDay')}
          onPress={() => setDate(addDaysIso(date, -1))}
        />
        <Text variant="label" className="min-w-24 text-center" accessibilityLiveRegion="polite">
          {dateLabel}
        </Text>
        <IconButton
          icon="chevron-right"
          label={t('common.nextDay')}
          onPress={() => setDate(addDaysIso(date, 1))}
          disabled={date >= today}
        />
      </View>

      <DaySummaryCard eaten={summary.total} targets={targets} />

      {summary.meals.map((group) => (
        <MealSection key={group.mealType} group={group} date={date} />
      ))}

      <Button
        label={t('nutrition.recipes')}
        variant="secondary"
        onPress={() => router.push({ pathname: '/food/add', params: { date, tab: 'recipes' } })}
      />
    </Screen>
  );
}
