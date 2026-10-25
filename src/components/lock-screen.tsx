import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { unlockApp, useAppLock } from '@/lib/app-lock';
import { logout } from '@/lib/auth';

// Covers the whole app while it is locked. The screens underneath stay mounted (so the person returns to where they
// were) but are hidden from touch and from screen readers by the root layout.
export function LockScreen() {
  const { ready } = useAppLock();
  const dark = useColorScheme() === 'dark';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await unlockApp();
    setBusy(false);
    if (r.ok) return;
    if (r.error === 'not_enrolled' || r.error === 'passcode_not_set' || r.error === 'not_available') {
      setError('Kunci layar HP tidak aktif lagi. Aktifkan kembali di pengaturan HP, atau keluar dari akun.');
    } else if (r.error === 'lockout') {
      setError('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.');
    } else if (r.error !== 'user_cancel' && r.error !== 'system_cancel' && r.error !== 'app_cancel') {
      setError('Tidak dapat membuka kunci. Coba lagi.');
    }
  }

  // Ask straight away when the lock appears; the button is for trying again.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(unlock, 0); // after the screen is drawn, not during the effect itself
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <ThemedView style={[StyleSheet.absoluteFill, { zIndex: 900 }]}>
      {ready && (
        <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16 }}>
          <Image
            source={dark ? require('@/assets/images/logo-lockup-dark.png') : require('@/assets/images/logo-lockup.png')}
            style={{ width: 200, height: 54, alignSelf: 'center' }}
            contentFit="contain"
            accessibilityLabel="ReturnIt"
          />
          <ThemedText type="title" style={{ textAlign: 'center' }}>
            ReturnIt terkunci
          </ThemedText>
          <ThemedText style={{ textAlign: 'center' }}>
            Gunakan sidik jari, wajah, atau PIN HP untuk membuka.
          </ThemedText>
          <View style={{ gap: 10 }}>
            <AppButton title={busy ? 'Memeriksa…' : 'Buka kunci'} onPress={unlock} disabled={busy} />
            <AppButton variant="secondary" title="Keluar dari akun" onPress={logout} disabled={busy} />
          </View>
          {error && (
            <ThemedText type="small" themeColor="errorText" style={{ textAlign: 'center' }}>
              {error}
            </ThemedText>
          )}
        </SafeAreaView>
      )}
    </ThemedView>
  );
}
