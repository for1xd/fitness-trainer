import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BASE_LIFT_EXERCISE, BASE_LIFTS, type BaseLiftId } from '@/features/catalog/data';
import { latestWeightKg, useProfile } from '@/features/profile/store';
import {
  estimateOneRm,
  estimateOneRmFromLevel,
  MAX_REPS_FOR_ESTIMATE,
  type ExperienceLevel,
  type OneRmEstimate,
} from '@/features/strength/logic/oneRm';
import { useStrength } from '@/features/strength/store';
import { formatNumber } from '@/lib/format';
import { Button, ChoiceCard, CompactNumberInput, Header, Screen, Segmented, Text } from '@/ui';

const LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];

interface LiftInput {
  mode: 'know' | 'unknown';
  weightKg?: number;
  reps?: number;
}

export default function StrengthScreen() {
  const { t } = useTranslation();
  const sex = useProfile((s) => s.profile?.sex ?? 'male');
  const bodyWeight = useProfile((s) => latestWeightKg(s.weights) ?? s.targets?.weightKg ?? 75);
  const saved = useStrength((s) => s.estimates);
  const savedLevel = useStrength((s) => s.experience);
  const saveCalibration = useStrength((s) => s.saveCalibration);

  const [level, setLevel] = useState<ExperienceLevel>(savedLevel ?? 'beginner');
  const [inputs, setInputs] = useState<Record<BaseLiftId, LiftInput>>(
    () =>
      Object.fromEntries(BASE_LIFTS.map((l) => [l, { mode: 'know' }])) as Record<
        BaseLiftId,
        LiftInput
      >,
  );

  const estimateFor = (
    lift: BaseLiftId,
  ): { est: OneRmEstimate; fromSet: boolean } | { error: true } => {
    const input = inputs[lift];
    if (input.mode === 'know' && input.weightKg !== undefined && input.reps !== undefined) {
      if (input.reps > MAX_REPS_FOR_ESTIMATE) return { error: true };
      // Для підтягувань вводиться обтяження — додаємо вагу тіла
      const weight = lift === 'pullup' ? bodyWeight + input.weightKg : input.weightKg;
      const est = estimateOneRm(weight, input.reps);
      if (est) return { est, fromSet: true };
    }
    return { est: estimateOneRmFromLevel(lift, sex, level, bodyWeight), fromSet: false };
  };

  const patch = (lift: BaseLiftId, p: Partial<LiftInput>) =>
    setInputs((s) => ({ ...s, [lift]: { ...s[lift], ...p } }));

  const save = () => {
    const estimates: Record<string, OneRmEstimate> = {};
    for (const lift of BASE_LIFTS) {
      const r = estimateFor(lift);
      if ('error' in r) continue;
      // Оцінку за рівнем не записуємо поверх уже відомого 1ПМ
      if (!r.fromSet && saved[BASE_LIFT_EXERCISE[lift]]) continue;
      estimates[BASE_LIFT_EXERCISE[lift]] = r.est;
    }
    saveCalibration(level, estimates);
    router.back();
  };

  return (
    <Screen edges={['top', 'bottom']} footer={<Button label={t('strength.save')} onPress={save} />}>
      <Header title={t('strength.title')} />
      <Text variant="body" className="-mt-2 text-muted">
        {t('strength.intro')}
      </Text>

      <View className="gap-3">
        <Text variant="heading">{t('strength.level')}</Text>
        {LEVELS.map((l) => (
          <ChoiceCard
            key={l}
            title={t(`experience.${l}.title`)}
            description={t(`experience.${l}.desc`)}
            selected={level === l}
            onPress={() => setLevel(l)}
          />
        ))}
        <Text variant="caption">{t('strength.levelHint')}</Text>
      </View>

      {BASE_LIFTS.map((lift) => {
        const input = inputs[lift];
        const r = estimateFor(lift);
        const current = saved[BASE_LIFT_EXERCISE[lift]];
        return (
          <View key={lift} className="gap-3 rounded-3xl bg-surface p-4">
            <View>
              <Text variant="heading">{t(`strength.lifts.${lift}`)}</Text>
              {current ? (
                <Text variant="caption">
                  {t('strength.oneRm', { value: formatNumber(current.oneRmKg, 1) })}
                </Text>
              ) : null}
            </View>
            <Segmented
              label=""
              value={input.mode}
              onChange={(mode) => patch(lift, { mode })}
              options={[
                { value: 'know', label: t('strength.know') },
                { value: 'unknown', label: t('strength.unknown') },
              ]}
            />
            {input.mode === 'know' ? (
              <View className="flex-row items-center gap-3">
                <View className="flex-1 gap-1">
                  <Text variant="caption">{t('strength.weight')}</Text>
                  <CompactNumberInput
                    label={`${t(`strength.lifts.${lift}`)}, ${t('strength.weight')}`}
                    value={input.weightKg}
                    onChange={(weightKg) => patch(lift, { weightKg })}
                    decimal
                    suffix={t('common.kg')}
                    width={120}
                  />
                </View>
                <Text variant="number" className="pt-5">
                  ×
                </Text>
                <View className="flex-1 gap-1">
                  <Text variant="caption">{t('strength.reps')}</Text>
                  <CompactNumberInput
                    label={`${t(`strength.lifts.${lift}`)}, ${t('strength.reps')}`}
                    value={input.reps}
                    onChange={(reps) => patch(lift, { reps })}
                    width={100}
                  />
                </View>
              </View>
            ) : null}
            {lift === 'pullup' && input.mode === 'know' ? (
              <Text variant="caption">{t('strength.pullupHint')}</Text>
            ) : null}
            {'error' in r ? (
              <Text variant="caption" className="text-danger">
                {t('strength.tooManyReps')}
              </Text>
            ) : (
              <Text variant="label">
                {t(r.fromSet ? 'strength.oneRm' : 'strength.fromLevel', {
                  value: formatNumber(r.est.oneRmKg, 1),
                })}
                <Text variant="caption">, {t(`strength.confidence.${r.est.confidence}`)}</Text>
              </Text>
            )}
          </View>
        );
      })}

      <Text variant="caption">{t('strength.formula')}</Text>
    </Screen>
  );
}
