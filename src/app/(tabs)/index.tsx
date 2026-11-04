import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { TargetsSummary } from '@/features/profile/components/TargetsSummary';
import { latestWeightKg, useProfile } from '@/features/profile/store';
import { latestTrendKg } from '@/features/progress/logic/weightTrend';
import { LIMITS } from '@/features/onboarding/store';
import { formatLongDate, formatNumber } from '@/lib/format';
import { Button, Notice, NumberField, Screen, Text } from '@/ui';

export default function TodayScreen() {
  const { t } = useTranslation();
  const targets = useProfile((s) => s.targets);
  const weights = useProfile((s) => s.weights);
  const logWeight = useProfile((s) => s.logWeight);
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

      <TargetsSummary targets={targets} waterMl={targets.waterMl} label={t('today.target')} />

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
          onPress={submitWeight}
          disabled={weight === undefined}
        />
        {message ? <Notice text={message} /> : null}
      </View>

      <Text variant="caption">{t('disclaimer')}</Text>
    </Screen>
  );
}
