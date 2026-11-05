import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, View } from 'react-native';

import { formatNumber } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, NumberField, Text } from '@/ui';

import { scheduledDayIndex } from '@/features/workouts/logic/schedule';
import { useWorkouts } from '@/features/workouts/store';

import { dailyWaterMl } from '../logic/water';
import { MAX_SINGLE_ML, QUICK_ADD_ML, waterTotalMl } from '../logic/waterDay';
import { useWater } from '../store';

interface Props {
  date: string;
  weightKg: number;
}

export function WaterCard({ date, weightKg }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const entries = useWater((s) => s.entries);
  const manualTraining = useWater((s) => s.trainingDays.includes(date));
  // Тренувальний день — якщо позначено вручну, є тренування в програмі або воно вже виконане
  const planned = useWorkouts(
    (s) =>
      (s.program ? scheduledDayIndex(s.program, date) !== null : false) ||
      s.workouts.some((w) => w.date === date),
  );
  const isTraining = manualTraining || planned;
  const { add, undoLast, setTrainingDay } = useWater.getState();
  const [customOpen, setCustomOpen] = useState(false);
  const [customMl, setCustomMl] = useState<number | undefined>(330);

  const total = waterTotalMl(entries, date);
  const target = dailyWaterMl({ weightKg, isTrainingDay: isTraining });
  const share = Math.min(1, total / target);
  const liters = (ml: number) => formatNumber(ml / 1000, 2);

  return (
    <View className="gap-4 rounded-card border border-hairline bg-surface p-4">
      <View className="flex-row items-end justify-between">
        <View>
          <Text variant="heading">{t('water.title')}</Text>
          <Text variant="caption">{t('water.of', { target: liters(target) })}</Text>
        </View>
        <Text variant="number" className="text-[32px] leading-[38px]">
          {liters(total)}
          <Text variant="caption"> {t('common.liters')}</Text>
        </Text>
      </View>

      <View
        className="h-3 overflow-hidden rounded-full bg-line"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: target, now: total }}
      >
        <View className="h-full rounded-full bg-water" style={{ width: `${share * 100}%` }} />
      </View>
      {total >= target ? <Text variant="caption">{t('water.done')}</Text> : null}

      <View className="flex-row gap-2">
        {QUICK_ADD_ML.map((ml) => (
          <Button
            key={ml}
            label={t('water.add', { ml })}
            accessibilityLabel={t('water.addLabel', { ml })}
            onPress={() => add(ml, date)}
            compact
            className="flex-1"
          />
        ))}
        <Button
          label={t('water.custom')}
          accessibilityLabel={t('water.customLabelFull')}
          variant="secondary"
          onPress={() => setCustomOpen((v) => !v)}
          compact
          className="flex-1"
        />
      </View>

      {customOpen ? (
        <View className="gap-3">
          <NumberField
            label={t('water.customLabel')}
            unit={t('common.ml')}
            value={customMl}
            onChange={setCustomMl}
            min={50}
            max={MAX_SINGLE_ML}
            step={50}
            fallback={330}
          />
          <Button
            label={t('water.addCustom')}
            disabled={customMl === undefined}
            onPress={() => {
              if (customMl === undefined) return;
              add(customMl, date);
              setCustomOpen(false);
            }}
          />
        </View>
      ) : null}

      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text variant="label">{t('water.trainingDay')}</Text>
          <Text variant="caption">{t('water.trainingHint')}</Text>
        </View>
        <Switch
          accessibilityLabel={t('water.trainingDay')}
          value={isTraining}
          disabled={planned}
          onValueChange={(v) => setTrainingDay(date, v)}
          trackColor={{ true: colors['plate-blue'], false: colors.line }}
          thumbColor={colors.raised}
        />
      </View>

      {total > 0 ? (
        <Button
          label={t('water.undo')}
          variant="ghost"
          onPress={() => undoLast(date)}
          className="self-start"
        />
      ) : null}
    </View>
  );
}
