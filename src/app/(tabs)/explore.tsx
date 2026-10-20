import { useEffect, useState } from 'react';
import { Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiFetch, logout } from '@/lib/auth';
import { useSignedIn } from '@/lib/use-signed-in';

export default function SettingsScreen() {
  const signedIn = useSignedIn();
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (!signedIn) {
      setInfo('');
      return;
    }
    (async () => {
      try {
        const res = await apiFetch('/account');
        if (!res.ok) return setInfo('Gagal memuat akun (kode ' + res.status + ').');
        const a = await res.json();
        setInfo((a.displayName ? a.displayName + '\n' : '') + a.email);
      } catch {
        setInfo('Tidak dapat terhubung ke server.');
      }
    })();
  }, [signedIn]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 24, gap: 16 }}>
        <ThemedText type="title">Pengaturan</ThemedText>
        {signedIn ? (
          <>
            <ThemedText>{info || 'Memuat...'}</ThemedText>
            <Button title="Keluar" onPress={logout} />
          </>
        ) : (
          <ThemedText>Anda belum masuk. Buka tab Pembelian untuk masuk.</ThemedText>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}