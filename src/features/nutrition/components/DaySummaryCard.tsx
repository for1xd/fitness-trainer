import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { NutritionTargets } from '@/features/onboarding/logic/nutrition';
import { formatNumber } from '@/lib/format';
import { useTweenedNumber } from '@/lib/useTweenedNumber';
import { useTheme } from '@/theme/ThemeProvider';
import { FitText, Ring, Text } from '@/ui';

import { progressShare, remaining } from '../logic/daySummary';
import type { Nutrients } from '../types';

interface Props {
  eaten: Nutrients;
  targets: Pick<NutritionTargets, 'kcal' | 'proteinG' | 'fatG' | 'carbsG'>;
}

const RING = 148;
const STROKE = 14;
/** Число в кільці — не ширше 70 % внутрішнього діаметра */
const RING_TEXT_W = Math.floor((RING - STROKE * 2) * 0.7);
/** Підпис під числом дрібніший — може бути трохи ширшим */
const RING_LABEL_W = Math.floor((RING - STROKE * 2) * 0.86);
const MACRO_RING = 56;
const MACRO_STROKE = 6;

/** Колір з прозорістю — для приглушених порожніх треків кілець. */
export function tint(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Кільце калорій із залишком, блок «з'їдено» і три кільця БЖВ у кольорах дисків. */
export function DaySummaryCard({ eaten, targets }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const left = remaining(targets, eaten);
  const over = left.kcal < 0;
  const ringColor = over ? colors.danger : colors.accent;

  const macros = [
    { key: 'protein', eaten: eaten.proteinG, target: targets.proteinG, color: colors['plate-red'] },
    { key: 'fat', eaten: eaten.fatG, target: targets.fatG, color: colors['plate-yellow'] },
    { key: 'carbs', eaten: eaten.carbsG, target: targets.carbsG, color: colors['plate-green'] },
  ] as const;

  const leftLabel = t(over ? 'nutrition.over' : 'nutrition.left');
  // Цифри «рахують» до нового значення
  const shownLeft = Math.round(useTweenedNumber(Math.abs(left.kcal)));
  const shownEaten = Math.round(useTweenedNumber(eaten.kcal));

  return (
    <View className="gap-6 rounded-card border border-hairline bg-surface p-4 md:flex-row md:items-center md:gap-8">
      <View className="flex-row items-center gap-4">
        <Ring
          size={RING}
          stroke={STROKE}
          progress={progressShare(eaten.kcal, targets.kcal)}
          color={ringColor}
          trackColor={tint(ringColor, 0.18)}
        >
          <FitText
            text={formatNumber(shownLeft)}
            maxWidth={RING_TEXT_W}
            maxFontSize={32}
            minFontSize={14}
            color={over ? colors.danger : colors.ink}
            accessibilityLabel={`${formatNumber(Math.abs(left.kcal))} ${t('common.kcal')} ${leftLabel}`}
          />
          <Text
            variant="caption"
            numberOfLines={1}
            style={{ maxWidth: RING_LABEL_W }}
            className="text-center"
          >
            {leftLabel}
          </Text>
        </Ring>

        {/* «З'їдено»: велике число + підпис, без кривого переносу */}
        <View className="min-w-0 flex-1 gap-1">
          <Text variant="caption">{t('nutrition.eatenLabel')}</Text>
          <Text variant="number" numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
            {formatNumber(shownEaten)}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {t('nutrition.ofTarget', { target: formatNumber(targets.kcal) })}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between gap-2 md:flex-1">
        {macros.map((m) => {
          const pct = Math.round(progressShare(m.eaten, m.target) * 100);
          return (
            <View key={m.key} className="min-w-0 flex-1 items-center gap-2">
              <Ring
                size={MACRO_RING}
                stroke={MACRO_STROKE}
                progress={progressShare(m.eaten, m.target)}
                color={m.color}
                trackColor={tint(m.color, 0.2)}
              >
                <FitText
                  text={`${pct}%`}
                  maxWidth={Math.floor((MACRO_RING - MACRO_STROKE * 2) * 0.7)}
                  maxFontSize={12}
                  minFontSize={9}
                  fontFamily="Manrope_700Bold"
                />
              </Ring>
              <View className="flex-row items-center gap-1">
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.color }} />
                <Text variant="label" numberOfLines={1}>
                  {t(`result.${m.key}`)}
                </Text>
              </View>
              <Text variant="caption" numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
                {t('nutrition.macroOf', {
                  eaten: formatNumber(m.eaten),
                  target: formatNumber(m.target),
                })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
