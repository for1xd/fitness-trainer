import { Icon } from '@/ui/icons/Icon';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SaveIndicator } from '@/features/data/components/SaveIndicator';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = ComponentProps<typeof Icon>['name'];

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

/**
 * Перехід між вкладками: crossfade + зсув на 10 px у бік руху, 180 мс.
 * progress: -1 — вкладка лівіше активної, 0 — активна, 1 — правіше.
 */
function forTabShift({
  current,
}: {
  current: { progress: Animated.AnimatedInterpolation<number> };
}) {
  return {
    sceneStyle: {
      opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [-10, 0, 10],
          }),
        },
      ],
    },
  };
}

const TAB_TRANSITION = {
  animation: 'timing' as const,
  config: { duration: 180, easing: Easing.out(Easing.cubic) },
};

/** Широкий екран (ПК, планшет горизонтально) — бокова навігація. */
const WIDE_BREAKPOINT = 1024;

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  // Таб-бар піднято над системною смугою (home indicator): відступ = safe area + 8
  const bottomPad = insets.bottom + 8;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          // «Зменшити рух» — миттєва зміна вкладки
          ...(reduced
            ? { animation: 'none' as const }
            : { sceneStyleInterpolator: forTabShift, transitionSpec: TAB_TRANSITION }),
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
                <Icon name={tab.icon} size={size} color={String(color)} />
              ),
            }}
          />
        ))}
      </Tabs>
      <SaveIndicator bottom={wide ? 24 : 64 + bottomPad + 8} />
    </View>
  );
}
