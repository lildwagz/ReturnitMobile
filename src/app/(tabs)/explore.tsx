import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { setAppLockEnabled, useAppLock } from '@/lib/app-lock';
import { logout } from '@/lib/auth';
import { exportPurchasesCsv } from '@/lib/export';
import { showToast } from '@/lib/toast';
import { useAccount } from '@/lib/use-account';
import { useSignedIn } from '@/lib/use-signed-in';

// One line of the settings card: title, one line of help, and a control on the right.
function SettingRow({ title, help, right, onPress, last }: { title: string; help: string; right: React.ReactNode; onPress?: () => void; last?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontWeight: 700 }}>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {help}
        </ThemedText>
      </View>
      {right}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const signedIn = useSignedIn();
  const { account } = useAccount(signedIn);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const lock = useAppLock();
  const [lockBusy, setLockBusy] = useState(false);

  async function toggleLock(on: boolean) {
    setLockBusy(true);
    const problem = await setAppLockEnabled(on);
    setLockBusy(false);
    if (problem) showToast(problem);
  }

  async function exportData() {
    setExporting(true);
    const problem = await exportPurchasesCsv();
    setExporting(false);
    if (problem) showToast(problem);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 120 }}>
          <View style={{ gap: 4 }}>
            <ThemedText type="title">Pengaturan</ThemedText>
            <ThemedText themeColor="textSecondary">Preferensi dan pengelolaan data.</ThemedText>
          </View>
          {!signedIn ? (
            <ThemedText>Anda belum masuk. Buka tab Home untuk masuk.</ThemedText>
          ) : (
            <>
              <ThemedView type="backgroundElement" style={{ borderRadius: 16, paddingHorizontal: 14 }}>
                <SettingRow
                  title="Akun"
                  help={
                    account?.deletionScheduledFor
                      ? 'Penghapusan akun dijadwalkan. Ketuk untuk membatalkan.'
                      : (account?.email ?? 'Profil, ekspor data, dan hapus akun.')
                  }
                  right={<ThemedText themeColor="textSecondary" style={{ fontSize: 24 }}>›</ThemedText>}
                  onPress={() => router.push('/account' as never)}
                />
                <SettingRow
                  title="Preferensi pengingat"
                  help="Pengingat 30, 14, 7, 3, dan 1 hari sebelum akhir garansi."
                  right={<AppButton variant="secondary" title="Atur →" onPress={() => router.push('/reminders' as never)} />}
                />
                <SettingRow
                  title="Kunci aplikasi"
                  help="Minta sidik jari, wajah, atau PIN HP saat aplikasi dibuka, dan setelah ditinggalkan lebih dari 30 detik."
                  right={<Switch value={lock.enabled} onValueChange={toggleLock} disabled={lockBusy} accessibilityLabel="Kunci aplikasi" />}
                />
                <SettingRow
                  title="Ekspor data"
                  help="Unduh daftar pembelian sebagai file CSV."
                  right={<AppButton small variant="secondary" title={exporting ? 'Menyiapkan…' : 'Ekspor CSV'} onPress={exportData} disabled={exporting} />}
                />
                <SettingRow
                  title="Privasi & keamanan"
                  help="Struk disimpan privat dan hanya dapat dibuka oleh pemilik akun."
                  right={<ThemedText>{showPrivacy ? '▲' : '🔒'}</ThemedText>}
                  onPress={() => setShowPrivacy((v) => !v)}
                  last
                />
              </ThemedView>
              {showPrivacy && (
                <ThemedView type="backgroundElement" style={{ padding: 14, borderRadius: 14, gap: 8 }}>
                  <ThemedText type="small">
                    Data yang disimpan: profil Anda, catatan pembelian, file struk, pengaturan pengingat,
                    riwayat pengingat, dan token notifikasi perangkat.
                  </ThemedText>
                  <ThemedText type="small">
                    File struk hanya boleh PDF, JPEG atau PNG, dipindai terhadap malware sebelum disimpan, dan
                    disimpan secara privat. Struk dibuka lewat tautan sementara yang berlaku beberapa menit.
                  </ThemedText>
                  <ThemedText type="small">
                    Menghapus struk atau pembelian ikut menghapus file-nya. Token notifikasi dihapus saat Anda
                    keluar dari aplikasi.
                  </ThemedText>
                  <ThemedText type="small">
                    Menghapus akun dijadwalkan dengan masa tunggu (biasanya 7 hari) dan dapat dibatalkan.
                    Setelah itu, akun, pembelian, struk, dan pengingat dihapus permanen.
                  </ThemedText>
                  <ThemedText type="small">
                    Data Anda tidak dapat dilihat pengguna lain. Aplikasi tidak pernah melihat kata sandi Anda.
                  </ThemedText>
                </ThemedView>
              )}
              <AppButton variant="secondary" title="Keluar" onPress={logout} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
