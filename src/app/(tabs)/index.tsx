import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Button, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiFetch, login } from '@/lib/auth';
import { CONNECTION_ERROR, Purchase, errorMessage } from '@/lib/purchase';
import { useSignedIn } from '@/lib/use-signed-in';
import { STATUS_LABEL, WarrantyStatus, daysLeft, formatIDR, warrantyStatus } from '@/lib/warranty';

const PAGE_SIZE = 20;

const BADGE_COLOR: Record<WarrantyStatus, string> = {
  active: '#1B8A3A',
  expiring: '#C77700',
  expired: '#C62828',
  unknown: '#6B7280',
};

function Badge({ status }: { status: WarrantyStatus }) {
  return (
    <View
      style={{
        backgroundColor: BADGE_COLOR[status],
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
      }}>
      <ThemedText type="small" style={{ color: 'white' }}>
        {STATUS_LABEL[status]}
      </ThemedText>
    </View>
  );
}

function Row({ p, onPress }: { p: Purchase; onPress: () => void }) {
  const status = warrantyStatus(p.warrantyEndDate);
  const left = daysLeft(p.warrantyEndDate);
  return (
    <Pressable onPress={onPress}>
      <ThemedView type="backgroundElement" style={{ padding: 16, borderRadius: 16, gap: 6 }}>
        <ThemedText type="title" style={{ fontSize: 20, lineHeight: 26 }}>
          {p.productName}
        </ThemedText>
        <ThemedText type="small">{(p.storeName ? p.storeName + ' - ' : '') + p.purchaseDate}</ThemedText>
        <ThemedText type="small">{formatIDR(p.price, p.currency)}</ThemedText>
        <Badge status={status} />
        {left !== null && (
          <ThemedText type="small">
            {left >= 0 ? left + ' hari lagi' : 'Berakhir ' + -left + ' hari lalu'}
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

export default function PurchasesScreen() {
  const router = useRouter();
  const signedIn = useSignedIn();
  const [items, setItems] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const fetchPage = useCallback(async (page: number) => {
    const res = await apiFetch(`/purchases?page=${page}&pageSize=${PAGE_SIZE}`);
    if (!res.ok) throw new Error(await errorMessage(res));
    return res.json();
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage(1);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof TypeError ? CONNECTION_ERROR : e instanceof Error ? e.message : CONNECTION_ERROR);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loading || items.length >= total) return;
    setLoading(true);
    try {
      const data = await fetchPage(Math.floor(items.length / PAGE_SIZE) + 1);
      setItems((prev) => [...prev, ...data.items]);
      setTotal(data.total);
    } catch {
      setError('Gagal memuat data berikutnya.');
    } finally {
      setLoading(false);
    }
  }, [loading, items.length, total, fetchPage]);

  // Reload whenever this tab comes back into view (for example after saving a form).
  useFocusEffect(
    useCallback(() => {
      if (signedIn) refresh();
    }, [signedIn, refresh]),
  );

  if (signedIn === null) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!signedIn) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center' }}>
          <ThemedText type="title">ReturnIt</ThemedText>
          <ThemedText>Masuk untuk melihat catatan pembelian dan garansi Anda.</ThemedText>
          <Button title="Masuk" onPress={async () => setLoginError(await login())} />
          {loginError && <ThemedText type="small">{loginError}</ThemedText>}
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 16, gap: 12 }}>
        <ThemedText type="title">Pembelian</ThemedText>
        <ThemedText type="small">{total} catatan</ThemedText>
        {error && (
          <ThemedText type="small" style={{ color: '#C62828' }}>
            {error}
          </ThemedText>
        )}
        <Button title="Tambah Pembelian" onPress={() => router.push('/purchase/new' as never)} />
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <Row p={item} onPress={() => router.push(('/purchase/' + item.id) as never)} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={loading ? null : <ThemedText>Belum ada pembelian.</ThemedText>}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}