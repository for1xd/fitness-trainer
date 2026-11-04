import { StatusBar } from 'expo-status-bar';
import { vars } from 'nativewind';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';

import { useSettings } from '@/features/settings/store';

import { cssVariables, palettes, type Palette, type SchemeName } from './tokens';

interface ThemeValue {
  scheme: SchemeName;
  colors: Palette;
}

const ThemeContext = createContext<ThemeValue>({ scheme: 'light', colors: palettes.light });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSettings((s) => s.theme);
  const system = useColorScheme();
  const scheme: SchemeName =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(() => ({ scheme, colors: palettes[scheme] }), [scheme]);
  const style = useMemo(() => vars(cssVariables(palettes[scheme])), [scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1, backgroundColor: value.colors.bg }, style]}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

/** Сирі кольори для місць, де className недоступний (іконки, навігація, SVG). */
export const useTheme = () => useContext(ThemeContext);
