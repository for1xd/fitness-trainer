import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, View } from 'react-native';

import { useReducedMotion } from '@/lib/useReducedMotion';
import { LogoMark, Text } from '@/ui';

const FILL_MS = 600;
const NAME_MS = 220;

/** Перший запуск: дуга знака заповнюється 0 → 75 %, потім з'являється назва. */
export function BrandIntro() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [name] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / FILL_MS);
      setProgress(1 - (1 - p) ** 3); // ease-out
      if (p < 1) frame = requestAnimationFrame(tick);
      else
        Animated.timing(name, {
          toValue: 1,
          duration: NAME_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, name]);

  return (
    <View className="flex-row items-center gap-3" accessibilityRole="header">
      <LogoMark size={48} progress={reduced ? 1 : progress} />
      <Animated.View
        style={{
          opacity: name,
          transform: [
            { translateX: name.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
          ],
        }}
      >
        <Text variant="heading" className="font-display text-[22px] leading-[28px]">
          {t('appName')}
        </Text>
      </Animated.View>
    </View>
  );
}
