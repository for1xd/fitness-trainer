import '@/global.css';
import '@/i18n';

import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { Unbounded_600SemiBold, Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import i18n from 'i18next';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { selectSignedIn, subscribeToAuth, useAuth } from '@/features/auth/store';
import { useOnboarding } from '@/features/onboarding/store';
import { useProfile } from '@/features/profile/store';
import { useSettings } from '@/features/settings/store';
import { usePersistHydrated } from '@/lib/usePersistHydrated';
import { ThemeProvider } from '@/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const PERSISTED_STORES = [useAuth, useProfile, useSettings, useOnboarding] as const;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Unbounded_600SemiBold,
    Unbounded_700Bold,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  const hydrated = usePersistHydrated(PERSISTED_STORES);
  const language = useSettings((s) => s.language);

  useEffect(() => subscribeToAuth(), []);
  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);

  const ready = fontsLoaded && hydrated;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootStack />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function RootStack() {
  const signedIn = useAuth(selectSignedIn);
  const hasProfile = useProfile((s) => s.profile !== null && s.targets !== null);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn && hasProfile}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
