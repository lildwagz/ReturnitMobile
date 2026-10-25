import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppTextInput } from '@/components/app-text-input';
import { EmptyState } from '@/components/empty-state';
import { PurchaseRow } from '@/components/purchase-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors } from '@/constants/theme';
import { t, tn } from '@/i18n';
import { usePurchaseList, useRefetchStaleOnFocus } from '@/lib/queries';
import { keys } from '@/lib/query-client';
import { useSignedIn } from '@/lib/use-signed-in';

const filters = (): { value: string; label: string }[] => [
  { value: '', label: t('list.all') },
  { value: 'active', label: t('status.active') },
  { value: 'expiring', label: t('status.expiring') },
  { value: 'expired', label: t('status.expired') },
  { value: 'none', label: t('status.unknown') },
];

export default function PurchasesScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const signedIn = useSignedIn() === true; // the tabs only exist while signed in

  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState(''); // search text after a short pause in typing
  const [filter, setFilter] = useState('');

  // Wait 400 ms after the last keystroke before searching.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchText.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const list = usePurchaseList(filter, query, signedIn);
  useRefetchStaleOnFocus(keys.purchases);

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const total = list.data?.pages[0]?.total ?? 0;
  const error = list.error ? list.error.message : list.isFetchNextPageError ? t('list.loadMoreFailed') : null;
  const filtering = !!query || !!filter;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 16, gap: 12 }}>
        <View style={{ gap: 4 }}>
          <ThemedText type="title">{t('list.title')}</ThemedText>
          <ThemedText themeColor="textSecondary">{t('list.subtitle')}</ThemedText>
        </View>
        <AppButton title={t('home.add')} onPress={() => router.push('/purchase/new' as never)} />

        <AppTextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder={t('list.search')}
          autoCorrect={false}
          maxLength={120}
        />

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {filters().map((f) => {
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

        <ThemedText type="small">{tn('records', total)}</ThemedText>
        {error && (
          <View style={{ gap: 8 }}>
            <ThemedText type="small" themeColor="errorText">
              {error}
            </ThemedText>
            <AppButton variant="secondary" title={t('home.retry')} onPress={() => list.refetch()} />
          </View>
        )}

        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PurchaseRow p={item} onPress={() => router.push(('/purchase/' + item.id) as never)} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshing={list.isRefetching && !list.isFetchingNextPage}
          onRefresh={() => list.refetch()}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            list.isLoading ? null : filtering ? (
              <EmptyState title={t('list.noResults')} help={t('list.noResultsHelp')} />
            ) : (
              <EmptyState title={t('empty.noPurchases')} help={t('empty.addFirst')} />
            )
          }
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}
