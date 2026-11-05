import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from './Text';

export function StepProgress({ current, total }: { current: number; total: number }) {
  const { t } = useTranslation();
  return (
    <View
      className="gap-2"
      accessibilityRole="progressbar"
      aria-label={t('onboarding.stepOf', { current, total })}
      accessibilityValue={{ min: 1, max: total, now: current }}
    >
      <Text variant="caption">{t('onboarding.stepOf', { current, total })}</Text>
      <View className="flex-row gap-2">
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < current ? 'bg-ink' : 'bg-line'}`}
          />
        ))}
      </View>
    </View>
  );
}
