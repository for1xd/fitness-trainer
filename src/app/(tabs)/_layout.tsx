import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const TABS: {
  name: string;
  key: 'today' | 'nutrition' | 'workouts' | 'progress' | 'profile';
  icon: IconName;
}[] = [
  { name: 'index', key: 'today', icon: 'calendar-today' },
  { name: 'nutrition', key: 'nutrition', icon: 'food-apple-outline' },
  { name: 'workouts', key: 'workouts', icon: 'dumbbell' },
  { name: 'progress', key: 'progress', icon: 'chart-line' },
  { name: 'profile', key: 'profile', icon: 'account-outline' },
];

/** Широкий екран (ПК, планшет горизонтально) — бокова навігація. */
const WIDE_BREAKPOINT = 1024;

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const insets = useSafeAreaInsets();
  // Таб-бар піднято над системною смугою (home indicator): відступ = safe area + 8
  const bottomPad = insets.bottom + 8;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: wide ? 'left' : 'bottom',
        tabBarLabelPosition: wide ? 'beside-icon' : 'below-icon',
        tabBarActiveTintColor: wide ? colors.ink : colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: wide ? colors.surface : undefined,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.hairline,
          borderRightColor: colors.line,
          ...(wide
            ? { width: 232, paddingTop: 24 }
            : { height: 64 + bottomPad, paddingTop: 6, paddingBottom: bottomPad }),
        },
        tabBarItemStyle: wide
          ? { borderRadius: 12, marginHorizontal: 12, minHeight: 48 }
          : { minHeight: 52, paddingVertical: 2 },
        tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: wide ? 15 : 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(`tabs.${tab.key}`),
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={tab.icon} size={size} color={String(color)} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
