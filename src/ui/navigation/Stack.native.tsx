import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTheme } from '@/theme/ThemeProvider';

/** Телефон: нативний стек із системним виїздом справа; фон екрана — фон теми. */
export { Stack };

type Options = NonNullable<ComponentProps<typeof Stack>['screenOptions']>;

export function useStackScreenOptions(): Options {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  return {
    headerShown: false,
    contentStyle: { backgroundColor: colors.bg },
    animation: reduced ? 'fade' : 'slide_from_right',
    animationDuration: 280,
  };
}
