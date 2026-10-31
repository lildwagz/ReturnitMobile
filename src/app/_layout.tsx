import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  NotoSansArabic_400Regular,
  NotoSansArabic_500Medium,
  NotoSansArabic_700Bold,
} from '@expo-google-fonts/noto-sans-arabic';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, View, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { LockScreen } from '@/components/lock-screen';
import { ToastHost } from '@/components/toast-host';
import { UpdateGate } from '@/components/update-gate';
import { loadLanguage, t, useLanguage } from '@/i18n';
import { useAppGate } from '@/lib/app-gate';
import { checkAppConfig } from '@/lib/app-config';
import { loadAppLock, lockAfterAbsence, useAppLock } from '@/lib/app-lock';
import { queryClient } from '@/lib/query-client';
import { useSignedIn } from '@/lib/use-signed-in';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const signedIn = useSignedIn();
  const gate = useAppGate();
  const lock = useAppLock();
  const { ready: languageReady, language } = useLanguage();

  // The saved language (and the writing direction that goes with it) is read once, before anything is drawn.
  useEffect(() => {
    loadLanguage();
  }, []);

  // App lock: read the saved setting once, and lock again when the app was away for longer than the grace time.
  useEffect(() => {
    loadAppLock();
    let leftAt: number | null = null;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') leftAt = Date.now();
      else if (s === 'active') {
        lockAfterAbsence(leftAt);
        leftAt = null;
      }
    });
    return () => sub.remove();
  }, []);
  // Locked: the screens stay where they are but nothing can be touched or read until the person is recognised.
  const locked = signedIn === true && (!lock.ready || (lock.enabled && lock.locked));

  // Ask the server whether this version may still be used: when the app opens and every time it comes back.
  useEffect(() => {
    checkAppConfig();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkAppConfig();
    });
    return () => sub.remove();
  }, []);
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
    NotoSansArabic_400Regular,
    NotoSansArabic_500Medium,
    NotoSansArabic_700Bold,
  });
  // The native splash screen stays up until the fonts are ready; a font error falls back to the system font.
  if ((!fontsLoaded && !fontError) || !languageReady) return null;

  // The server said this version must be updated (or the service is in maintenance): nothing else is shown.
  if (gate.status === 'update_required' || gate.status === 'maintenance') {
    return (
      <ThemeProvider key={language} value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <UpdateGate />
      </ThemeProvider>
    );
  }

  return (
    <ShareIntentProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
    {/* A new language remounts everything below, so every text is drawn again in it. */}
    <ThemeProvider key={language} value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {/* The tab bar and the purchase screens only exist after login; before it only the login screen does.
          Logging out flips the guard and the router returns to the login screen by itself. */}
      <View
        style={{ flex: 1 }}
        pointerEvents={locked ? 'none' : 'auto'}
        accessibilityElementsHidden={locked}
        importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn === null}>
          <Stack.Screen name="loading" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn === false}>
          <Stack.Screen name="login" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn === true}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="purchase" />
          <Stack.Screen name="reminder-settings" options={{ headerShown: true, title: t('set.reminders') }} />
          <Stack.Screen name="account" options={{ headerShown: true, title: t('set.account') }} />
        </Stack.Protected>
      </Stack>
      </View>
      {locked && <LockScreen />}
      <ToastHost />
    </ThemeProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
    </ShareIntentProvider>
  );
}
