import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { NutritionTargets } from '@/features/onboarding/logic/nutrition';
import { formatNumber } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Ring, Text } from '@/ui';

import { progressShare, remaining } from '../logic/daySummary';
import type { Nutrients } from '../types';

interface Props {
  eaten: Nutrients;
  targets: Pick<NutritionTargets, 'kcal' | 'proteinG' | 'fatG' | 'carbsG'>;
}

/** Кільце калорій із залишком у центрі та три кільця БЖВ у кольорах дисків. */
export function DaySummaryCard({ eaten, targets }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const left = remaining(targets, eaten);
  const over = left.kcal < 0;

  const macros = [
    { key: 'protein', eaten: eaten.proteinG, target: targets.proteinG, color: colors['plate-red'] },
    { key: 'fat', eaten: eaten.fatG, target: targets.fatG, color: colors['plate-yellow'] },
    { key: 'carbs', eaten: eaten.carbsG, target: targets.carbsG, color: colors['plate-green'] },
  ] as const;

  return (
    <View className="gap-5 rounded-3xl bg-surface p-4 md:flex-row md:items-center md:gap-8">
      <View className="flex-row items-center gap-5">
        <Ring
          size={152}
          stroke={14}
          progress={progressShare(eaten.kcal, targets.kcal)}
          color={over ? colors.danger : colors.ink}
          trackColor={colors.line}
        >
          <Text
            variant="number"
            className={`text-[34px] leading-[40px] ${over ? 'text-danger' : ''}`}
            accessibilityLabel={`${formatNumber(Math.abs(left.kcal))} ${t('common.kcal')} ${t(over ? 'nutrition.over' : 'nutrition.left')}`}
          >
            {formatNumber(Math.abs(left.kcal))}
          </Text>
          <Text variant="caption">{t(over ? 'nutrition.over' : 'nutrition.left')}</Text>
        </Ring>
        <Text variant="body" className="flex-1 text-muted md:hidden">
          {t('nutrition.eaten', {
            eaten: formatNumber(eaten.kcal),
            target: formatNumber(targets.kcal),
          })}
        </Text>
      </View>

      <View className="flex-row justify-between md:flex-1 md:flex-col md:gap-3">
        <Text variant="body" className="hidden text-muted md:flex">
          {t('nutrition.eaten', {
            eaten: formatNumber(eaten.kcal),
            target: formatNumber(targets.kcal),
          })}
        </Text>
        {macros.map((m) => (
          <View key={m.key} className="flex-1 items-center gap-1.5 md:flex-row md:gap-3">
            <Ring
              size={52}
              stroke={7}
              progress={progressShare(m.eaten, m.target)}
              color={m.color}
              trackColor={colors.line}
            />
            <View className="items-center md:items-start">
              <Text variant="label">{t(`result.${m.key}`)}</Text>
              <Text variant="caption">
                {t('nutrition.macroOf', {
                  eaten: formatNumber(m.eaten),
                  target: formatNumber(m.target),
                })}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
