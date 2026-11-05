import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from 'expo-router';
import { useMemo, type ReactNode } from 'react';

import { useTheme } from './ThemeProvider';

/**
 * Кольори навігації з нашої палітри. Без цього навігатори фарбують контейнери в сірий
 * стандартної теми (rgb 242,242,242) — його й видно на мить під час переходів.
 */
export function NavigationTheme({ children }: { children: ReactNode }) {
  const { scheme, colors } = useTheme();
  const value = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.bg,
        card: colors.surface,
        text: colors.ink,
        border: colors.hairline,
        primary: colors.accent,
        notification: colors.danger,
      },
    };
  }, [scheme, colors]);
  return <NavThemeProvider value={value}>{children}</NavThemeProvider>;
}
