import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useProfile } from '@/features/profile/store';
import { weightTrend } from '@/features/progress/logic/weightTrend';
import { parseIsoDate } from '@/lib/dates';
import { formatNumber, formatShortDate } from '@/lib/format';
import { EmptyState, Screen, Text } from '@/ui';

export default function ProgressScreen() {
  const { t } = useTranslation();
  const weights = useProfile((s) => s.weights);
  const trend = useMemo(() => weightTrend(weights), [weights]);
  const latest = trend.at(-1);

  if (!latest) {
    return (
      <Screen>
        <EmptyState
          icon="scale-bathroom"
          title={t('progress.emptyTitle')}
          body={t('progress.emptyBody')}
          actionLabel={t('progress.emptyAction')}
          onAction={() => router.navigate('/')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">{t('progress.title')}</Text>
      <View>
        <Text variant="hero">
          {formatNumber(latest.trendKg, 1)}
          <Text variant="number" className="text-muted">
            {' '}
            {t('common.kg')}
          </Text>
        </Text>
        <Text variant="caption">{t('progress.trend')}</Text>
      </View>

      <View className="gap-2">
        <Text variant="heading">{t('progress.history')}</Text>
        <View className="overflow-hidden rounded-2xl bg-surface">
          {[...trend].reverse().map((p, i) => (
            <View
              key={p.date}
              className={`min-h-14 flex-row items-center px-4 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <Text variant="body" className="flex-1">
                {formatShortDate(parseIsoDate(p.date))}
              </Text>
              <Text variant="label" className="w-24 text-right">
                {formatNumber(p.weightKg, 1)} {t('common.kg')}
              </Text>
              <Text variant="caption" className="w-24 text-right">
                {formatNumber(p.trendKg, 1)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
