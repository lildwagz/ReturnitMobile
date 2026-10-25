import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { login } from '@/lib/auth';
import { AppButton } from '@/components/app-button';

export function LoginGate() {
  const [error, setError] = useState<string | null>(null);
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center' }}>
        <ThemedText type="title" style={{ color: Brand.primary }}>
          ReturnIt
        </ThemedText>
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
