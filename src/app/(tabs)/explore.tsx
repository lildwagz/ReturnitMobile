import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Button, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API, apiFetch, login, logout } from '@/lib/auth';
import { CONNECTION_ERROR, errorMessage } from '@/lib/purchase';
import { useSignedIn } from '@/lib/use-signed-in';

type Account = {
  id: string;
  email: string;
  displayName?: string | null;
  deletionScheduledFor?: string | null;
};

async function errorCode(res: Response): Promise<string | null> {
  try {
    return (await res.clone().json())?.error?.code ?? null;
  } catch {
    return null;
  }
}

export default function SettingsScreen() {
  const signedIn = useSignedIn();
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);  

  const loadAccount = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await apiFetch('/account');
      if (res.ok) setAccount(await res.json());
      else setLoadError(await errorMessage(res));
    } catch {
      setLoadError(CONNECTION_ERROR);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (signedIn) loadAccount();
      else setAccount(null);
    }, [signedIn, loadAccount]),
  );

  async function requestDeletion() {
    setBusy(true);
    setMessage(null);
    try {
      let res = await apiFetch('/account', { method: 'DELETE' });
      if (res.status === 401 && (await errorCode(res)) === 'reauthentication_required') {
        setMessage('Untuk keamanan, masuk sekali lagi untuk melanjutkan.');
        const problem = await login(true);
        if (problem) {
          setMessage('Masuk ulang tidak selesai, jadi penghapusan dibatalkan.');
          return;
        }
        res = await apiFetch('/account', { method: 'DELETE' });
      }
      if (res.status === 202) {
        setMessage(null);
        await loadAccount();
      } else if (res.status === 401) {
        setMessage('Login belum cukup baru. Coba lagi.');
      } else {
        setMessage(await errorMessage(res));
      }
    } catch {
      setMessage(CONNECTION_ERROR);
    } finally {
      setBusy(false);
    }
  }

  function confirmDeletion() {
    Alert.alert(
      'Hapus akun?',
      'Akun dijadwalkan terhapus permanen setelah masa tunggu (biasanya 7 hari). Selama masa tunggu Anda dapat membatalkan. Setelah itu, semua pembelian, struk, dan pengingat hilang dan tidak dapat dipulihkan.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus akun', style: 'destructive', onPress: requestDeletion },
      ],
    );
  }

  async function cancelDeletion() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await apiFetch('/account/deletion/cancel', { method: 'POST' });
      if (res.status === 204) await loadAccount();
      else if (res.status === 409) setMessage('Masa tunggu sudah berakhir, akun tidak dapat dipulihkan lagi.');
      else setMessage(await errorMessage(res));
    } catch {
      setMessage(CONNECTION_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 120 }}>
          <ThemedText type="title">Pengaturan</ThemedText>
          <ThemedText type="small">{'Server: ' + API}</ThemedText>          
          {!signedIn ? (
            <ThemedText>Anda belum masuk. Buka tab Home untuk masuk.</ThemedText>
          ) : (
            <>
              {loadError && (
                <View style={{ gap: 8 }}>
                  <ThemedText style={{ color: '#C62828' }}>{loadError}</ThemedText>
                  <Button title="Coba lagi" onPress={loadAccount} />
                </View>
              )}
              {!account && !loadError && <ActivityIndicator />}
              {account && (
                <ThemedText>
                  {(account.displayName ? account.displayName + '\n' : '') + account.email}
                </ThemedText>
              )}

              {account?.deletionScheduledFor ? (
                <ThemedView type="backgroundElement" style={{ padding: 14, borderRadius: 14, gap: 10 }}>
                  <ThemedText style={{ fontWeight: '700' }}>Penghapusan akun dijadwalkan</ThemedText>
                  <ThemedText>
                    {'Akun dan semua datanya akan dihapus permanen pada ' +
                      new Date(account.deletionScheduledFor).toLocaleString() +
                      '. Anda masih bisa membatalkan sebelum waktu itu.'}
                  </ThemedText>
                  {busy ? <ActivityIndicator /> : <Button title="Batalkan penghapusan" onPress={cancelDeletion} />}
                </ThemedView>
              ) : (
                account && (busy ? <ActivityIndicator /> : <Button title="Hapus akun" color="#C62828" onPress={confirmDeletion} />)
              )}

              {message && <ThemedText>{message}</ThemedText>}
                            <Pressable onPress={() => setShowPrivacy((v) => !v)}>
                <ThemedText style={{ fontWeight: '700' }}>
                  {showPrivacy ? 'Privasi & keamanan ▲' : 'Privasi & keamanan ▼'}
                </ThemedText>
              </Pressable>
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
              <Button title="Keluar" onPress={logout} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}