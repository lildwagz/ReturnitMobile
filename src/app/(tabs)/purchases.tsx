import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { PurchaseRow } from '@/components/purchase-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors } from '@/constants/theme';
import { apiFetch, login } from '@/lib/auth';
import { CONNECTION_ERROR, Purchase, errorMessage } from '@/lib/purchase';
import { useSignedIn } from '@/lib/use-signed-in';
import { AppButton } from '@/components/app-button';
import { AppTextInput } from '@/components/app-text-input';

const PAGE_SIZE = 20;

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'expiring', label: 'Segera Berakhir' },
  { value: 'expired', label: 'Kedaluwarsa' },
  { value: 'none', label: 'Tidak Diketahui' },
];

export default function PurchasesScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const signedIn = useSignedIn();

  const [items, setItems] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState(''); // search text after a short pause in typing
  const [filter, setFilter] = useState('');
  const latest = useRef(0); // ignores answers to outdated requests

  // Wait 400 ms after the last keystroke before searching.
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchText.trim()), 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const fetchPage = useCallback(
    async (page: number) => {
      let path = `/purchases?page=${page}&pageSize=${PAGE_SIZE}`;
      if (query) path += '&q=' + encodeURIComponent(query);
      if (filter) path += '&warrantyStatus=' + filter;
      const res = await apiFetch(path);
      if (!res.ok) throw new Error(await errorMessage(res));
      return res.json();
    },
    [query, filter],
  );

  const refresh = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage(1);
      if (id !== latest.current) return;
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      if (id !== latest.current) return;
      setItems([]);
      setTotal(0);
      setError(e instanceof TypeError ? CONNECTION_ERROR : e instanceof Error ? e.message : CONNECTION_ERROR);
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loading || items.length >= total) return;
    const id = latest.current;
    setLoading(true);
    try {
      const data = await fetchPage(Math.floor(items.length / PAGE_SIZE) + 1);
      if (id !== latest.current) return;
      setItems((prev) => [...prev, ...data.items]);
      setTotal(data.total);
    } catch {
      setError('Gagal memuat data berikutnya.');
    } finally {
      setLoading(false);
    }
  }, [loading, items.length, total, fetchPage]);

  // Runs when the tab comes into view, and again whenever the search or filter changes.
  useFocusEffect(
    useCallback(() => {
      if (signedIn) refresh();
    }, [signedIn, refresh]),
  );
  useEffect(() => {
    if (signedIn === false) {
      setItems([]);
      setTotal(0);
    }
  }, [signedIn]);
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
          <AppButton title="Masuk" onPress={async () => setLoginError(await login())} />
          {loginError && <ThemedText type="small">{loginError}</ThemedText>}
        </SafeAreaView>
      </ThemedView>
    );
  }

  const filtering = !!query || !!filter;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 16, gap: 12 }}>
        <View style={{ gap: 4 }}>
          <ThemedText type="title">Pembelian Saya</ThemedText>
          <ThemedText themeColor="textSecondary">Cari produk dan cek status garansinya.</ThemedText>
        </View>
        <AppButton title="＋ Tambah Pembelian" onPress={() => router.push('/purchase/new' as never)} />

        <AppTextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Cari nama produk atau toko"
         
          autoCorrect={false}
          maxLength={120}
          style={{
            color: colors.text,
            backgroundColor: colors.backgroundElement,
            borderRadius: 12,
            padding: 12,
            fontSize: 16,
          }}
        />

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTERS.map((f) => {
              const selected = filter === f.value;
              return (
                <Pressable
                  key={f.value || 'all'}
                  onPress={() => setFilter(f.value)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 16,
                    backgroundColor: selected ? Brand.primary : colors.backgroundElement,
                  }}>
                  <ThemedText type="small" style={{ color: selected ? 'white' : colors.text }}>
                    {f.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <ThemedText type="small">{total} catatan</ThemedText>
        {error && (
          <View style={{ gap: 8 }}>
            <ThemedText type="small" themeColor="errorText">
              {error}
            </ThemedText>
            <AppButton variant="secondary" title="Coba lagi" onPress={refresh} />
          </View>
        )}

        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PurchaseRow p={item} onPress={() => router.push(('/purchase/' + item.id) as never)} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshing={loading}
          onRefresh={refresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            loading ? null : filtering ? (
              <EmptyState title="Tidak ada hasil" help="Coba kata kunci atau filter yang berbeda." />
            ) : (
              <EmptyState title="Belum ada pembelian" help="Tambahkan pembelian pertama Anda." />
            )
          }
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}