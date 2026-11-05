import '@/global.css';
import '@/i18n';
import '@/lib/zodConfig';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import i18n from 'i18next';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/features/syncTables';

import { subscribeToAuth, useAuth } from '@/features/auth/store';
import { useOnboarding } from '@/features/onboarding/store';
import { useNutrition } from '@/features/nutrition/store';
import { useGym } from '@/features/gym/store';
import { useProfile } from '@/features/profile/store';
import { useProgress } from '@/features/progress/store';
import { useReminders } from '@/features/reminders/store';
import { useReminderScheduler } from '@/features/reminders/useReminderScheduler';
import { useSettings } from '@/features/settings/store';
import { useStrength } from '@/features/strength/store';
import { useWater } from '@/features/water/store';
import { useWorkouts } from '@/features/workouts/store';
import { startSyncEngine } from '@/lib/sync/engine';
import { useOutbox } from '@/lib/sync/store';
import { usePersistHydrated } from '@/lib/usePersistHydrated';
import { useWebFontsReady } from '@/lib/useWebFontsReady';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { NavigationTheme } from '@/theme/NavigationTheme';
import { BootScreen, ConfirmHost } from '@/ui';
import { Stack, useStackScreenOptions } from '@/ui/navigation/Stack';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const FONT_FAMILIES = [
  'Unbounded_600SemiBold',
  'Unbounded_700Bold',
  'Manrope_500Medium',
  'Manrope_600SemiBold',
  'Manrope_700Bold',
] as const;
const PERSISTED_STORES = [
  useAuth,
  useProfile,
  useSettings,
  useOnboarding,
  useNutrition,
  useWater,
  useOutbox,
  useStrength,
  useGym,
  useWorkouts,
  useProgress,
  useReminders,
] as const;

export default function RootLayout() {
  // Шрифти обрізані до латиниці й кирилиці (scripts/subset-fonts.sh): ~270 КБ замість ~1 МБ
  const [fontsLoaded] = useFonts({
    Unbounded_600SemiBold: require('../../assets/fonts/Unbounded_600SemiBold.ttf'),
    Unbounded_700Bold: require('../../assets/fonts/Unbounded_700Bold.ttf'),
    Manrope_500Medium: require('../../assets/fonts/Manrope_500Medium.ttf'),
    Manrope_600SemiBold: require('../../assets/fonts/Manrope_600SemiBold.ttf'),
    Manrope_700Bold: require('../../assets/fonts/Manrope_700Bold.ttf'),
  });
  const hydrated = usePersistHydrated(PERSISTED_STORES);
  const language = useSettings((s) => s.language);

  useEffect(() => subscribeToAuth(), []);
  useEffect(() => (hydrated ? startSyncEngine() : undefined), [hydrated]);
  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);

  const fontsReady = useWebFontsReady(FONT_FAMILIES, fontsLoaded);
  const ready = fontsReady && hydrated;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <BootScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationTheme>
            <RootStack />
          </NavigationTheme>
          <ConfirmHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function RootStack() {
  // Без входу: перший запуск — онбординг, далі одразу головний екран
  const hasProfile = useProfile((s) => s.profile !== null && s.targets !== null);
  useReminderScheduler();
  const screenOptions = useStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Protected guard={hasProfile}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="food" />
        <Stack.Screen name="recipe" />
        <Stack.Screen name="strength" />
        <Stack.Screen name="gym" />
        <Stack.Screen name="program" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="workout" />
        <Stack.Screen name="exercises" />
        <Stack.Screen name="body" />
        <Stack.Screen name="reminders" />
      </Stack.Protected>
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
