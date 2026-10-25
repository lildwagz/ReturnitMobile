import { Image } from 'expo-image';
import { useState } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { login } from '@/lib/auth';
import { AppButton } from '@/components/app-button';

export function LoginGate() {
  const dark = useColorScheme() === 'dark';
  const [error, setError] = useState<string | null>(null);
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center' }}>
        <Image
          source={dark ? require('@/assets/images/logo-lockup-dark.png') : require('@/assets/images/logo-lockup.png')}
          style={{ width: 240, height: 65 }}
          contentFit="contain"
          accessibilityLabel="ReturnIt"
        />
        <ThemedText>Masuk untuk melihat catatan pembelian dan garansi Anda.</ThemedText>
        <AppButton title="Masuk" onPress={async () => setError(await login())} />
        <AppButton
          variant="secondary"
          title="Lanjutkan dengan Google"
          onPress={async () => setError(await login(false, false, 'google'))}
        />
        <AppButton
          variant="secondary"
          title="Daftar akun baru"
          onPress={async () => setError(await login(false, true))}
        />
        {error && (
          <ThemedText type="small" themeColor="errorText">
            {error}
          </ThemedText>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}
