import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Button, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoginGate } from '@/components/login-gate';
import { PurchaseRow } from '@/components/purchase-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiFetch } from '@/lib/auth';
import { CONNECTION_ERROR, Purchase, errorMessage } from '@/lib/purchase';
import { useSignedIn } from '@/lib/use-signed-in';

async function totalOf(query: string): Promise<number> {
  const res = await apiFetch('/purchases?' + query);
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()).total;
}

function Stat({ label, value, color }: { label: string; value: number | null; color?: string }) {
  return (
    <ThemedView type="backgroundElement" style={{ flex: 1, padding: 14, borderRadius: 16, gap: 4 }}>
      <ThemedText type="title" style={{ fontSize: 28, lineHeight: 34, color }}>
        {value === null ? '-' : value}
      </ThemedText>
      <ThemedText type="small">{label}</ThemedText>
    </ThemedView>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const signedIn = useSignedIn();
  const [active, setActive] = useState<number | null>(null);
  const [expiring, setExpiring] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [recent, setRecent] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, e, t, recentRes] = await Promise.all([
        totalOf('warrantyStatus=active&pageSize=1'),
        totalOf('warrantyStatus=expiring&pageSize=1'),
        totalOf('pageSize=1'),
        apiFetch('/purchases?pageSize=5'),
      ]);
      if (!recentRes.ok) throw new Error(await errorMessage(recentRes));
      const data = await recentRes.json();
      setActive(a);
      setExpiring(e);
      setTotal(t);
      setRecent(data.items);
    } catch (err) {
      setError(err instanceof TypeError ? CONNECTION_ERROR : err instanceof Error ? err.message : CONNECTION_ERROR);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (signedIn) load();
    }, [signedIn, load]),
  );

  if (signedIn === null) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  if (!signedIn) return <LoginGate />;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
          <ThemedText type="title">Halo, selamat datang</ThemedText>

          {error && (
            <View style={{ gap: 8 }}>
              <ThemedText type="small" style={{ color: '#C62828' }}>
                {error}
              </ThemedText>
              <Button title="Coba lagi" onPress={load} />
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat label="Garansi aktif" value={active} color="#1B8A3A" />
            <Stat label="Segera berakhir" value={expiring} color="#C77700" />
            <Stat label="Total pembelian" value={total} />
          </View>

          <Button title="Tambah Pembelian" onPress={() => router.push('/purchase/new' as never)} />

          <ThemedText type="title" style={{ fontSize: 22, lineHeight: 28 }}>
            Pembelian terbaru
          </ThemedText>
          {recent.length === 0 && !loading && !error ? (
            <ThemedText>Belum ada pembelian. Mulai dengan menambahkan pembelian pertama Anda.</ThemedText>
          ) : (
            recent.map((p) => (
              <PurchaseRow key={p.id} p={p} onPress={() => router.push(('/purchase/' + p.id) as never)} />
            ))
          )}
          {recent.length > 0 && (
            <Button title="Lihat semua" onPress={() => router.push('/purchases' as never)} />
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}