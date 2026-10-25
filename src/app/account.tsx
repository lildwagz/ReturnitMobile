import { ActivityIndicator, ScrollView, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { logout } from '@/lib/auth';
import { useAccount } from '@/lib/use-account';
import { useSignedIn } from '@/lib/use-signed-in';
import { formatDate } from '@/lib/warranty';

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ paddingVertical: 12, gap: 2, borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.border }}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText>{value}</ThemedText>
    </View>
  );
}

export default function AccountScreen() {
  const signedIn = useSignedIn();
  const { account, loadError, busy, message, loadAccount, confirmDeletion, cancelDeletion } = useAccount(signedIn);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}>
        {loadError && (
          <View style={{ gap: 8 }}>
            <ThemedText themeColor="errorText">{loadError}</ThemedText>
            <AppButton variant="secondary" title="Coba lagi" onPress={loadAccount} />
          </View>
        )}
        {!account && !loadError && <ActivityIndicator />}

        {account && (
          <ThemedView type="backgroundElement" style={{ borderRadius: 16, paddingHorizontal: 14 }}>
            <Row label="Nama" value={account.displayName || '-'} />
            <Row label="E-mail" value={account.email} />
            <Row label="Anggota sejak" value={formatDate(account.createdAt.slice(0, 10))} last />
          </ThemedView>
        )}
        {account && (
          <ThemedText type="small" themeColor="textSecondary">
            E-mail dan nama diatur di akun login Anda dan tidak dapat diubah di aplikasi. Untuk mengganti kata sandi,
            keluar lalu pilih &quot;Lupa kata sandi&quot; di halaman masuk.
          </ThemedText>
        )}

        {account?.deletionScheduledFor ? (
          <ThemedView type="backgroundElement" style={{ padding: 14, borderRadius: 14, gap: 10 }}>
            <ThemedText style={{ fontWeight: 700 }}>Penghapusan akun dijadwalkan</ThemedText>
            <ThemedText>
              {'Akun dan semua datanya akan dihapus permanen pada ' +
                new Date(account.deletionScheduledFor).toLocaleString() +
                '. Anda masih bisa membatalkan sebelum waktu itu. Pengingat dijeda selama masa tunggu.'}
            </ThemedText>
            {busy ? <ActivityIndicator /> : <AppButton variant="secondary" title="Batalkan penghapusan" onPress={cancelDeletion} />}
          </ThemedView>
        ) : (
          account && (busy ? <ActivityIndicator /> : <AppButton title="Hapus akun" variant="danger" onPress={confirmDeletion} />)
        )}

        {message && <ThemedText>{message}</ThemedText>}

        <AppButton variant="secondary" title="Keluar" onPress={logout} />
      </ScrollView>
    </ThemedView>
  );
}
