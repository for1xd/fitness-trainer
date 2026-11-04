import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { KCAL_PER_G } from '@/features/onboarding/logic/nutrition';
import { formatNumber } from '@/lib/format';

import { Text } from './Text';

interface Props {
  proteinG: number;
  fatG: number;
  carbsG: number;
}

const MIN_SHARE = 0.12;

/**
 * БЖВ як диски на грифі: товщина диска — частка калорій від макронутрієнта,
 * колір — колір олімпійського диска. Найважливіший (білок) — найближче до замка.
 */
export function PlateLoad({ proteinG, fatG, carbsG }: Props) {
  const { t } = useTranslation();
  const plates = [
    { key: 'protein', grams: proteinG, kcal: proteinG * KCAL_PER_G.protein, color: 'bg-protein' },
    { key: 'fat', grams: fatG, kcal: fatG * KCAL_PER_G.fat, color: 'bg-fat' },
    { key: 'carbs', grams: carbsG, kcal: carbsG * KCAL_PER_G.carbs, color: 'bg-carbs' },
  ] as const;
  const total = plates.reduce((s, p) => s + p.kcal, 0) || 1;
  const shares = plates.map((p) => Math.max(MIN_SHARE, p.kcal / total));

  const summary = plates
    .map((p) => `${t(`result.${p.key}`)} ${formatNumber(p.grams)} ${t('common.g')}`)
    .join(', ');

  return (
    <View className="gap-4" accessible accessibilityLabel={summary}>
      <View className="h-28 flex-row items-center">
        {/* замок грифа */}
        <View className="h-10 w-3 rounded-sm bg-muted" />
        <View className="h-full flex-1 flex-row items-center gap-[3px] pl-[3px]">
          {plates.map((p, i) => (
            <View
              key={p.key}
              style={{ flexGrow: shares[i] }}
              className={`h-full basis-0 rounded-lg ${p.color}`}
            />
          ))}
          {/* кінець грифа */}
          <View className="h-4 w-6 rounded-r-sm bg-muted" />
        </View>
      </View>
      <View className="flex-row">
        {plates.map((p) => (
          <View key={p.key} className="flex-1 gap-0.5">
            <View className="flex-row items-center gap-1.5">
              <View className={`h-2.5 w-2.5 rounded-full ${p.color}`} />
              <Text variant="caption">{t(`result.${p.key}`)}</Text>
            </View>
            <Text variant="number">
              {formatNumber(p.grams)}
              <Text variant="caption"> {t('common.g')}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
