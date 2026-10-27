import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, ScrollView, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddFab } from '@/components/add-fab';
import { EmptyState } from '@/components/empty-state';
import { PurchaseRow } from '@/components/purchase-row';
import { Skeleton } from '@/components/skeleton';
import { SwipeableRow } from '@/components/swipeable-row';
import { AppButton } from '@/components/app-button';
import { AppTextInput } from '@/components/app-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { t, tn } from '@/i18n';
import { apiJson } from '@/lib/api-query';
import { deletePurchaseWithConfirm } from '@/lib/delete-purchase';
import { Summary, usePurchaseList, useRefetchStaleOnFocus } from '@/lib/queries';
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

  // Chip counts come from the same GET /summary cache as the Home tiles (no extra endpoint).
  // Without a summary (error/loading) the chips show plain labels, never a stale number.
  const summary = useQuery({ queryKey: keys.summary, enabled: signedIn, queryFn: () => apiJson<Summary>('/summary') });
  const counts = summary.data?.counts;

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const total = list.data?.pages[0]?.total ?? 0;
  const error = list.error ? list.error.message : list.isFetchNextPageError ? t('list.loadMoreFailed') : null;
  const filtering = !!query || !!filter;

  // Only one swipeable row may stay open: opening one closes the previous.
  const swipeRefs = useRef(new Map<string, { close: () => void }>());

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Wide screens: keep the list as readable as the phones do. */}
        <View style={{ maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', flex: 1 }}>
          <FlatList
            data={items}
            keyExtractor={(p) => p.id}
            ListHeaderComponent={
              <View style={{ gap: Spacing.three, paddingBottom: Spacing.two }}>
                <View style={{ gap: Spacing.one }}>
                  <ThemedText type="title">{t('list.title')}</ThemedText>
                  <ThemedText themeColor="textSecondary">{t('list.subtitle')}</ThemedText>
                </View>
                <AppTextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder={t('list.search')}
                  autoCorrect={false}
                  maxLength={120}
                />
                {/* Scrollable status chips: five translated segments do not fit a 375 px row,
                    so a segmented control would either shrink labels or drop a status. */}
                <View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
                    {filters().map((f) => {
                      const selected = filter === f.value;
                      // Count per chip: from /summary's counts (All uses total); hidden when
                      // the summary has not loaded so a wrong number is never shown.
                      const n =
                        f.value === ''
                          ? counts?.total
                          : f.value === 'active'
                            ? counts?.active
                            : f.value === 'expiring'
                              ? counts?.expiring
                              : f.value === 'expired'
                                ? counts?.expired
                                : counts?.unknown;
                      const label = n === undefined || n === null ? f.label : t('list.count', { label: f.label, n });
                      return (
                        <Pressable
                          key={f.value || 'all'}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setFilter(f.value)}
                          android_ripple={{ color: Brand.primary + '1F' }}
                          style={({ pressed }) => ({
                            paddingHorizontal: Spacing.three,
                            paddingVertical: Spacing.two,
                            minHeight: 44,
                            justifyContent: 'center',
                            borderRadius: 999,
                            backgroundColor: selected ? Brand.primary : colors.backgroundElement,
                            opacity: pressed ? 0.85 : 1,
                          })}>
                          <ThemedText maxFontSizeMultiplier={1.2} type="small" style={{ color: selected ? 'white' : colors.text }}>
                            {label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
                <ThemedText type="small">{tn('records', total)}</ThemedText>
                {error && (
                  <View style={{ gap: Spacing.two }}>
                    <ThemedText type="small" themeColor="errorText">
                      {error}
                    </ThemedText>
                    <AppButton variant="secondary" title={t('home.retry')} onPress={() => list.refetch()} />
                  </View>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <SwipeableRow
                ref={(inst) => {
                  if (inst) swipeRefs.current.set(item.id, inst);
                  else swipeRefs.current.delete(item.id);
                }}
                editLabel={t('detail.edit')}
                deleteLabel={t('detail.delete')}
                onEdit={() => router.push({ pathname: '/purchase/edit', params: { id: item.id } } as never)}
                onDelete={() => deletePurchaseWithConfirm(item.id)}
                onWillOpen={() => {
                  swipeRefs.current.forEach((r, k) => {
                    if (k !== item.id) r.close();
                  });
                }}>
                <PurchaseRow
                  p={item}
                  onPress={() => router.push(('/purchase/' + item.id) as never)}
                  onEdit={() => router.push({ pathname: '/purchase/edit', params: { id: item.id } } as never)}
                  onDelete={() => deletePurchaseWithConfirm(item.id)}
                />
              </SwipeableRow>
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
              list.isLoading && items.length === 0 ? (
                <View style={{ gap: 12, paddingTop: 12 }}>
                  <Skeleton style={{ height: 88, borderRadius: Radius.md }} />
                  <Skeleton style={{ height: 88, borderRadius: Radius.md }} />
                  <Skeleton style={{ height: 88, borderRadius: Radius.md }} />
                </View>
              ) : list.isLoading ? null : filtering ? (
                <EmptyState title={t('list.noResults')} help={t('list.noResultsHelp')} icon="search" />
              ) : (
                <EmptyState
                  title={t('empty.noPurchases')}
                  help={t('empty.addFirst')}
                  icon="package"
                />
              )
            }
            contentContainerStyle={{ paddingHorizontal: Spacing.three, paddingBottom: 120 }}
          />
          <AddFab />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
