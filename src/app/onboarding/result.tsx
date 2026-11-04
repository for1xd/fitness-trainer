import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { calcTargets } from '@/features/onboarding/logic/nutrition';
import { isComplete, useOnboarding } from '@/features/onboarding/store';
import { TargetsSummary } from '@/features/profile/components/TargetsSummary';
import { useProfile } from '@/features/profile/store';
import { dailyWaterMl } from '@/features/water/logic/water';
import { birthDateFromAge } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Button, Notice, Screen, Text } from '@/ui';

export default function ResultScreen() {
  const { t } = useTranslation();
  const draft = useOnboarding((s) => s.draft);
  const clear = useOnboarding((s) => s.clear);
  const hasProfile = useProfile((s) => s.profile !== null);
  const saveProfile = useProfile((s) => s.saveProfile);

  const targets = useMemo(() => (isComplete(draft) ? calcTargets(draft) : null), [draft]);
  if (!isComplete(draft) || !targets) return <Redirect href="/onboarding" />;

  const save = () => {
    saveProfile(
      {
        sex: draft.sex,
        birthDate: birthDateFromAge(draft.ageYears),
        heightCm: draft.heightCm,
        activity: draft.activity,
        goal: draft.goal,
        pace: draft.goal === 'maintain' ? 'normal' : draft.pace,
      },
      draft.weightKg,
      hasProfile,
    );
    clear();
    router.replace('/');
  };

  const pct = Math.round(targets.adjustment * 100);
  const weekly = targets.expectedWeeklyChangeKg;

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View className="flex-row gap-3">
          <Button
            label={t('result.edit')}
            variant="secondary"
            onPress={() => router.back()}
            className="flex-1"
          />
          <Button
            label={t(hasProfile ? 'result.saveEdit' : 'result.save')}
            onPress={save}
            className="flex-[2]"
          />
        </View>
      }
    >
      <Text variant="title">{t('result.title')}</Text>

      <TargetsSummary
        targets={targets}
        waterMl={dailyWaterMl({ weightKg: draft.weightKg })}
        label={t('result.kcalLabel')}
      />

      {targets.warnings.map((w) => (
        <Notice key={w} tone="warn" text={t(`result.warnings.${w}`)} />
      ))}

      <View className="gap-2">
        <Text variant="heading">{t('result.how')}</Text>
        <Text variant="body" className="text-muted">
          {t('result.bmr', { value: formatNumber(targets.bmr) })}{' '}
          {t('result.tdee', { value: formatNumber(targets.tdee) })}{' '}
          {pct === 0
            ? t('result.adjustmentNone')
            : t('result.adjustment', { value: `${pct > 0 ? '+' : '−'}${Math.abs(pct)}` })}
          {weekly !== 0
            ? ` ${t('result.weekly', { value: `${weekly > 0 ? '+' : '−'}${formatNumber(Math.abs(weekly), 2)}` })}`
            : ''}
        </Text>
      </View>

      <Text variant="caption">{t('disclaimer')}</Text>
    </Screen>
  );
}
