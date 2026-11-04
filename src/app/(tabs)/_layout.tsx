import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions } from 'react-native';

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: wide ? 'left' : 'bottom',
        tabBarLabelPosition: wide ? 'beside-icon' : 'below-icon',
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: wide ? colors.surface : undefined,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.line,
          borderRightColor: colors.line,
          ...(wide ? { width: 232, paddingTop: 24 } : { minHeight: 64 }),
        },
        tabBarItemStyle: wide
          ? { borderRadius: 12, marginHorizontal: 12, minHeight: 48 }
          : undefined,
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
