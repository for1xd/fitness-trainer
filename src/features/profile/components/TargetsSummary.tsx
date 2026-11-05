import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { NutritionTargets } from '@/features/onboarding/logic/nutrition';
import { formatNumber } from '@/lib/format';
import { PlateLoad, Text } from '@/ui';

interface Props {
  targets: Pick<NutritionTargets, 'kcal' | 'proteinG' | 'fatG' | 'carbsG'>;
  waterMl: number;
  label: string;
}

/** Головна цифра (ккал), диски БЖВ і вода. */
export function TargetsSummary({ targets, waterMl, label }: Props) {
  const { t } = useTranslation();
  return (
    <View className="gap-6">
      <View>
        <Text variant="hero" accessibilityLabel={`${targets.kcal} ${t('common.kcal')}, ${label}`}>
          {formatNumber(targets.kcal)}
        </Text>
        <Text variant="caption">{label}</Text>
      </View>
      <PlateLoad proteinG={targets.proteinG} fatG={targets.fatG} carbsG={targets.carbsG} />
      <View className="flex-row items-center gap-3 rounded-card border border-hairline bg-surface px-4 py-3">
        <View className="h-8 w-1.5 rounded-full bg-water" />
        <Text variant="label" className="flex-1">
          {t('result.water')}
        </Text>
        <Text variant="number" className="text-xl">
          {t('result.waterValue', { value: formatNumber(waterMl / 1000, 2) })}
        </Text>
      </View>
    </View>
  );
}
