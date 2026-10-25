import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoginGate } from '@/components/login-gate';
import { PurchaseRow } from '@/components/purchase-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BannerStyle, BannerStyleDark } from '@/constants/theme';
import { apiFetch } from '@/lib/auth';
import { CONNECTION_ERROR, Purchase, errorMessage } from '@/lib/purchase';
import { useSignedIn } from '@/lib/use-signed-in';
import { AppButton } from '@/components/app-button';

async function totalOf(query: string): Promise<number> {
  const res = await apiFetch('/purchases?' + query);
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()).total;
}

function Stat({ label, value, tone }: { label: string; value: number | null; tone?: 'successText' | 'warningText' }) {
  const banners = useColorScheme() === 'dark' ? BannerStyleDark : BannerStyle;
  // Green / amber tint for the two status cards, as in the prototype.
  const tint = tone === 'successText' ? banners.active : tone === 'warningText' ? banners.expiring : null;
  return (
    <ThemedView
      type="backgroundElement"
      style={[{ flex: 1, padding: 14, borderRadius: 16, gap: 4 }, tint && { backgroundColor: tint.bg, borderColor: tint.border }]}>
      <ThemedText type="title" themeColor={tone}>
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
      setActive(null);
      setExpiring(null);
      setTotal(null);
      setRecent([]);
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

  useEffect(() => {
    if (signedIn === false) {
      setActive(null);
      setExpiring(null);
      setTotal(null);
      setRecent([]);
    }
  }, [signedIn]);

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
          <View style={{ gap: 4 }}>
            <ThemedText type="title">Halo, selamat datang 👋</ThemedText>
            <ThemedText themeColor="textSecondary">Semua bukti pembelian dan garansi dalam satu tempat.</ThemedText>
          </View>
          <AppButton title="＋ Tambah Pembelian" onPress={() => router.push('/purchase/new' as never)} />

          {error && (
            <View style={{ gap: 8 }}>
              <ThemedText type="small" themeColor="errorText">
                {error}
              </ThemedText>
              <AppButton variant="secondary" title="Coba lagi" onPress={load} />
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat label="Garansi aktif" value={active} tone="successText" />
            <Stat label="Segera berakhir" value={expiring} tone="warningText" />
            <Stat label="Total pembelian" value={total} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText type="subtitle" style={{ fontSize: 18, lineHeight: 24 }}>
              Pembelian terbaru
            </ThemedText>
            {recent.length > 0 && (
              <AppButton small variant="secondary" title="Lihat semua →" onPress={() => router.push('/purchases' as never)} />
            )}
          </View>
          {recent.length === 0 && !loading && !error ? (
            <ThemedText>Belum ada pembelian. Mulai dengan menambahkan pembelian pertama Anda.</ThemedText>
          ) : (
            recent.map((p) => (
              <PurchaseRow key={p.id} p={p} onPress={() => router.push(('/purchase/' + p.id) as never)} />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}