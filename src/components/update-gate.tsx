import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, ScrollView, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APP_VERSION, useAppGate } from '@/lib/app-gate';
import { checkAppConfig } from '@/lib/app-config';

// Full screen that cannot be closed: shown while the server says this version must be updated, or the service is under
// maintenance. The only ways out are updating, or (maintenance) trying again.
export function UpdateGate() {
  const gate = useAppGate();
  const dark = useColorScheme() === 'dark';
  const [checking, setChecking] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const maintenance = gate.status === 'maintenance';

  async function recheck() {
    setChecking(true);
    await checkAppConfig();
    setChecking(false);
  }

  async function openDownload() {
    setOpenError(null);
    if (!gate.downloadUrl) return;
    try {
      await Linking.openURL(gate.downloadUrl);
    } catch {
      setOpenError('Tidak dapat membuka halaman unduhan. Salin alamatnya: ' + gate.downloadUrl);
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 16, justifyContent: 'center' }}>
          <Image
            source={dark ? require('@/assets/images/logo-lockup-dark.png') : require('@/assets/images/logo-lockup.png')}
            style={{ width: 200, height: 54, alignSelf: 'center' }}
            contentFit="contain"
            accessibilityLabel="ReturnIt"
          />
          <ThemedText type="title" style={{ textAlign: 'center' }}>
            {maintenance ? 'Sedang dalam perbaikan' : 'Perbarui aplikasi'}
          </ThemedText>
          <ThemedText style={{ textAlign: 'center' }}>
            {gate.message ||
              (maintenance
                ? 'ReturnIt sedang dalam perbaikan. Coba lagi beberapa saat lagi.'
                : 'Versi aplikasi ini sudah tidak didukung. Perbarui ke versi terbaru untuk melanjutkan.')}
          </ThemedText>
          {!maintenance && (
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              {'Versi Anda: ' + APP_VERSION + (gate.minVersion ? ' · minimum: ' + gate.minVersion : '')}
            </ThemedText>
          )}
          <View style={{ gap: 10 }}>
            {!maintenance && gate.downloadUrl && <AppButton title="Perbarui sekarang" onPress={openDownload} />}
            <AppButton
              variant={maintenance || !gate.downloadUrl ? 'primary' : 'secondary'}
              title={checking ? 'Memeriksa…' : maintenance ? 'Coba lagi' : 'Saya sudah memperbarui'}
              onPress={recheck}
              disabled={checking}
            />
          </View>
          {openError && (
            <ThemedText type="small" themeColor="errorText" style={{ textAlign: 'center' }}>
              {openError}
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
