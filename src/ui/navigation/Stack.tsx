import { Easing } from 'react-native';
import {
  Stack,
  type StackCardInterpolationProps,
  type StackNavigationOptions,
} from 'expo-router/js-stack';

import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Веб: JS-стек — нативний стек у браузері не анімує переходи.
 * Відкриття екрана — виїзд справа 280 мс (ease-out), назад — дзеркально 240 мс (ease-in).
 * Анімуються лише transform і opacity; фон картки — фон теми, тож сірого «спалаху» немає.
 */
export { Stack };

function forSlide({ current, next, layouts }: StackCardInterpolationProps) {
  const width = layouts.screen.width;
  return {
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }),
        },
        // Попередній екран трохи зсувається вліво — видно напрямок руху
        ...(next
          ? [
              {
                translateX: next.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -width * 0.2],
                }),
              },
            ]
          : []),
      ],
    },
  };
}

export function useStackScreenOptions(): StackNavigationOptions {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  return {
    headerShown: false,
    cardStyle: { backgroundColor: colors.bg },
    cardShadowEnabled: false,
    cardOverlayEnabled: false,
    gestureEnabled: false,
    ...(reduced
      ? { animation: 'none' as const }
      : {
          cardStyleInterpolator: forSlide,
          transitionSpec: {
            open: {
              animation: 'timing',
              config: { duration: 280, easing: Easing.out(Easing.cubic) },
            },
            close: {
              animation: 'timing',
              config: { duration: 240, easing: Easing.in(Easing.cubic) },
            },
          },
        }),
  };
}
