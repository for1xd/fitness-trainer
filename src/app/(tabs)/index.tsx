import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { DaySummaryCard } from '@/features/nutrition/components/DaySummaryCard';
import { defaultMealType, summarizeDay } from '@/features/nutrition/logic/daySummary';
import { useNutrition } from '@/features/nutrition/store';
import { LIMITS } from '@/features/onboarding/store';
import { latestWeightKg, useProfile } from '@/features/profile/store';
import { latestTrendKg } from '@/features/progress/logic/weightTrend';
import { WaterCard } from '@/features/water/components/WaterCard';
import { todayIso } from '@/lib/dates';
import { formatLongDate, formatNumber } from '@/lib/format';
import { Button, Notice, NumberField, Screen, Text } from '@/ui';

export default function TodayScreen() {
  const { t } = useTranslation();
  const today = todayIso();
  const targets = useProfile((s) => s.targets);
  const weights = useProfile((s) => s.weights);
  const logWeight = useProfile((s) => s.logWeight);
  const entries = useNutrition((s) => s.entries);
  const eaten = useMemo(() => summarizeDay(entries, today).total, [entries, today]);
  const [weight, setWeight] = useState<number | undefined>(latestWeightKg(weights));
  const [message, setMessage] = useState<string | null>(null);

  if (!targets) return null;

  const submitWeight = () => {
    if (weight === undefined) return;
    const { updatedTargets } = logWeight(weight);
    const trend = latestTrendKg(useProfile.getState().weights) ?? weight;
    setMessage(
      updatedTargets
        ? t('today.targetsUpdated', { kcal: formatNumber(updatedTargets.kcal) })
        : t('today.logged', { trend: formatNumber(trend, 1) }),
    );
  };

  return (
    <Screen>
      <Text variant="title">{formatLongDate(new Date())}</Text>

      <DaySummaryCard eaten={eaten} targets={targets} />
      <Button
        label={t('nutrition.addFood')}
        onPress={() =>
          router.push({
            pathname: '/food/add',
            params: { date: today, meal: defaultMealType(new Date().getHours()) },
          })
        }
      />

      <WaterCard date={today} weightKg={latestWeightKg(weights) ?? targets.weightKg} />

      <View className="gap-4 rounded-3xl bg-surface p-4">
        <View className="gap-1">
          <Text variant="heading">{t('today.weighIn')}</Text>
          <Text variant="caption">{t('today.weighInHint')}</Text>
        </View>
        <NumberField
          label={t('onboarding.weight')}
          unit={t('common.kg')}
          value={weight}
          onChange={(v) => {
            setWeight(v);
            setMessage(null);
          }}
          fallback={targets.weightKg}
          {...LIMITS.weightKg}
        />
        <Button
          label={t('today.logWeight')}
          variant="secondary"
          onPress={submitWeight}
          disabled={weight === undefined}
        />
        {message ? <Notice text={message} /> : null}
      </View>

      <Text variant="caption">{t('disclaimer')}</Text>
    </Screen>
  );
}
