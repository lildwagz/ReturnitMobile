import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ToastHost } from '@/components/toast-host';
import { useSignedIn } from '@/lib/use-signed-in';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const signedIn = useSignedIn();
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
  });
  // The native splash screen stays up until the fonts are ready; a font error falls back to the system font.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {/* The tab bar and the purchase screens only exist after login; before it only the login screen does.
          Logging out flips the guard and the router returns to the login screen by itself. */}
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
          <Stack.Screen name="account" options={{ headerShown: true, title: 'Akun' }} />
        </Stack.Protected>
      </Stack>
      <ToastHost />
    </ThemeProvider>
  );
}
