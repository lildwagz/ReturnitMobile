import { useState } from 'react';
import { Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { login } from '@/lib/auth';

export function LoginGate() {
  const [error, setError] = useState<string | null>(null);
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center' }}>
        <ThemedText type="title">ReturnIt</ThemedText>
        <ThemedText>Masuk untuk melihat catatan pembelian dan garansi Anda.</ThemedText>
        <Button title="Masuk" onPress={async () => setError(await login())} />
        <Button title="Daftar akun baru" onPress={async () => setError(await login(false, true))} />        
        {error && <ThemedText type="small">{error}</ThemedText>}
      </SafeAreaView>
    </ThemedView>
  );
}