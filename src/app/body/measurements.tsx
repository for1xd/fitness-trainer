import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { MEASUREMENTS, useProgress, type MeasurementKey } from '@/features/progress/store';
import { Button, Header, NumberField, Screen, Text } from '@/ui';

const FALLBACK: Record<MeasurementKey, number> = {
  waistCm: 80,
  chestCm: 100,
  bicepsCm: 34,
  hipsCm: 98,
  thighCm: 56,
};

export default function MeasurementsScreen() {
  const { t } = useTranslation();
  const last = useProgress((s) => s.measurements.at(-1));
  const saveMeasurement = useProgress((s) => s.saveMeasurement);
  const [values, setValues] = useState<Partial<Record<MeasurementKey, number>>>({});

  const any = MEASUREMENTS.some((k) => values[k] !== undefined);

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <Button
          label={t('measure.save')}
          disabled={!any}
          onPress={() => {
            saveMeasurement(values);
            router.back();
          }}
        />
      }
    >
      <Header title={t('measure.title')} />
      <Text variant="body" className="-mt-2 text-muted">
        {t('measure.intro')}
      </Text>
      <View className="gap-5">
        {MEASUREMENTS.map((k) => (
          <NumberField
            key={k}
            label={t(`progress.m.${k}`)}
            unit={t('common.cm')}
            value={values[k]}
            onChange={(v) => setValues((s) => ({ ...s, [k]: v }))}
            min={10}
            max={250}
            step={0.5}
            fallback={last?.[k] ?? FALLBACK[k]}
            hint={t(`measure.hints.${k}`)}
          />
        ))}
      </View>
    </Screen>
  );
}
