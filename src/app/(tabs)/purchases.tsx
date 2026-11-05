import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, ScrollView, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddFab } from '@/components/add-fab';
import { BellButton } from '@/components/bell-button';
import { BucketChips } from '@/components/bucket-chips';
import { CategorySheet } from '@/components/category-sheet';
import { Icon } from '@/components/icon';
import { EmptyState } from '@/components/empty-state';
import { PurchaseRow } from '@/components/purchase-row';
import { Skeleton } from '@/components/skeleton';
import { STATUS_FILL, StatusBar, statusWord } from '@/components/status-overview';
import { SwipeableRow } from '@/components/swipeable-row';
import { AppButton } from '@/components/app-button';
import { AppTextInput } from '@/components/app-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { apiJson } from '@/lib/api-query';
import { useSelectedBucket } from '@/lib/buckets';
import { findCategory } from '@/lib/category';
import { deleteWithUndo, usePendingDeletes } from '@/lib/pending-delete';
import { Purchase } from '@/lib/purchase';
import { Summary, usePurchaseList, useRefetchStaleOnFocus } from '@/lib/queries';
import { keys } from '@/lib/query-client';
import { useSignedIn } from '@/lib/use-signed-in';
import { warrantyStatus, type WarrantyStatus } from '@/lib/warranty';

type StatusFilter = '' | 'active' | 'expiring' | 'expired' | 'none';

const filters = (): { value: StatusFilter; label: string; dot: WarrantyStatus | null; selectedBg: string | null }[] => [
  { value: '', label: t('list.all'), dot: null, selectedBg: null },
  { value: 'active', label: t('status.active'), dot: 'active', selectedBg: '#15803D' },
  { value: 'expiring', label: t('status.expiring'), dot: 'expiring', selectedBg: '#B45309' },
  { value: 'expired', label: t('status.expired'), dot: 'expired', selectedBg: '#B91C1C' },
  { value: 'none', label: t('status.unknown'), dot: 'unknown', selectedBg: '#475569' },
];

// What the list shows: purchases, and (when sorted by warranty end) a heading where the status changes.
type Row = { kind: 'section'; status: WarrantyStatus } | { kind: 'item'; p: Purchase };

// Sorted by warranty end the server returns the running warranties soonest first (so "expiring" comes before "active"), then the
// ended ones, then those with no date: each status is one run, and a heading goes in front of it.
function withSections(items: Purchase[], grouped: boolean): Row[] {
  if (!grouped) return items.map((p) => ({ kind: 'item', p }));
  const rows: Row[] = [];
  let last: WarrantyStatus | null = null;
  for (const p of items) {
    const s = warrantyStatus(p.warrantyEndDate);
    if (s !== last) {
      rows.push({ kind: 'section', status: s });
      last = s;
    }
    rows.push({ kind: 'item', p });
  }
  return rows;
}

export default function PurchasesScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const signedIn = useSignedIn() === true; // the tabs only exist while signed in

  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState(''); // search text after a short pause in typing
  const [filter, setFilter] = useState<StatusFilter>('');
  const [category, setCategory] = useState(''); // '' = all categories
  const [sort, setSort] = useState(''); // '' = newest purchase first, 'warrantyEnd' = warranty ending soonest first
  const [sheetOpen, setSheetOpen] = useState(false);

  // Wait 400 ms after the last keystroke before searching.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchText.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const list = usePurchaseList(filter, query, category, sort, signedIn);
  useRefetchStaleOnFocus(keys.purchases);

  // The counts come from the same GET /summary cache as Home (no extra endpoint). Without a summary (error/loading) the
  // chips show plain labels, never a stale number.
  const bucket = useSelectedBucket();
  const summary = useQuery({
    queryKey: [...keys.summary, bucket ?? 'all'],
    enabled: signedIn,
    queryFn: () => apiJson<Summary>('/summary' + (bucket ? '?bucketId=' + bucket : '')),
  });
  const counts = summary.data?.counts;

  const pendingDelete = usePendingDeletes(); // swiped away, waiting out the Undo time
  const items = (list.data?.pages.flatMap((p) => p.items) ?? []).filter((p) => !pendingDelete.has(p.id));
  const total = list.data?.pages[0]?.total ?? 0;
  const error = list.error ? list.error.message : list.isFetchNextPageError ? t('list.loadMoreFailed') : null;
  const filtering = !!query || !!filter || !!category;
  const chosenCategory = findCategory(category);
  const rows = withSections(items, sort === 'warrantyEnd');
  // A heading's count is only right when nothing narrows the list.
  const sectionCount = (s: WarrantyStatus): number | null =>
    counts && !filtering ? (s === 'unknown' ? counts.unknown : counts[s]) : null;

  function clearAll() {
    setSearchText('');
    setQuery('');
    setFilter('');
    setCategory('');
  }

  // Only one swipeable row may stay open: opening one closes the previous.
  const swipeRefs = useRef(new Map<string, { close: () => void }>());

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Wide screens: keep the list as readable as the phones do. */}
        <View style={{ maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', flex: 1 }}>
          <FlatList
            data={rows}
            keyExtractor={(r) => (r.kind === 'section' ? 'section:' + r.status : r.p.id)}
            ListHeaderComponent={
              <View style={{ gap: Spacing.three, paddingBottom: Spacing.two }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText accessibilityRole="header" type="title" numberOfLines={1}>
                      {t('list.title')}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('ov.totalLine', { n: counts ? counts.total : total })}
                    </ThemedText>
                  </View>
                  <BellButton />
                </View>
                <BucketChips />
                <View>
                  <View pointerEvents="none" style={{ position: 'absolute', start: 14, top: 14, zIndex: 1 }}>
                    <Icon name="search" size={20} color={colors.textSecondary} decorative />
                  </View>
                  <AppTextInput
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder={t('list.search')}
                    autoCorrect={false}
                    maxLength={120}
                    returnKeyType="search"
                    style={{ paddingStart: 44, paddingEnd: searchText ? 44 : 12, minHeight: 48, borderRadius: 14 }}
                  />
                  {searchText.length > 0 && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('list.clearSearch')}
                      onPress={() => {
                        setSearchText('');
                        setQuery('');
                      }}
                      hitSlop={6}
                      style={{ position: 'absolute', end: 0, top: 0, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="x" size={20} color={colors.textSecondary} decorative />
                    </Pressable>
                  )}
                </View>
                {/* How the purchases divide by status, in one bar. */}
                {counts && counts.total > 0 && <StatusBar counts={counts} />}
                {/* Scrollable status chips: five translated segments do not fit a 375 px row, so a segmented control would
                    either shrink labels or drop a status. Each has its status colour as a dot; the chosen one is filled. */}
                <View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
                    {filters().map((f) => {
                      const selected = filter === f.value;
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
                      const fg = selected ? (f.selectedBg ? '#FFFFFF' : colors.background) : colors.text;
                      return (
                        <Pressable
                          key={f.value || 'all'}
                          accessibilityRole="button"
                          accessibilityLabel={n === undefined || n === null ? f.label : t('list.count', { label: f.label, n })}
                          accessibilityState={{ selected }}
                          onPress={() => setFilter(f.value)}
                          android_ripple={{ color: Brand.primary + '1F' }}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingStart: 12,
                            paddingEnd: 14,
                            minHeight: 44,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: selected ? (f.selectedBg ?? colors.text) : colors.border,
                            backgroundColor: selected ? (f.selectedBg ?? colors.text) : colors.backgroundElement,
                            opacity: pressed ? 0.85 : 1,
                          })}>
                          {selected ? (
                            <Icon name="check" size={20} color={fg} decorative />
                          ) : f.dot ? (
                            <View style={{ width: 10, height: 10, borderRadius: 5, marginHorizontal: 5, backgroundColor: STATUS_FILL[f.dot] }} />
                          ) : null}
                          <ThemedText maxFontSizeMultiplier={1.2} type="small" style={{ color: fg, fontWeight: selected ? '700' : '400' }}>
                            {f.label}
                          </ThemedText>
                          {n !== undefined && n !== null && (
                            <ThemedText maxFontSizeMultiplier={1.2} type="small" style={{ color: selected ? fg : colors.textSecondary, opacity: selected ? 0.85 : 1 }}>
                              {n}
                            </ThemedText>
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
                {/* Category filter: one pill that opens the sheet; clear with the same pill's x. Wraps on a narrow screen or a large font. */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={chosenCategory ? t('cat.filterActive', { name: chosenCategory.label() }) : t('cat.filter')}
                    accessibilityState={{ selected: !!chosenCategory }}
                    onPress={() => setSheetOpen(true)}
                    android_ripple={{ color: Brand.primary + '1F' }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: Spacing.two,
                      paddingHorizontal: Spacing.three,
                      minHeight: 44,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: chosenCategory ? Brand.primary : colors.border,
                      backgroundColor: chosenCategory ? Brand.primary : colors.backgroundElement,
                      opacity: pressed ? 0.85 : 1,
                    })}>
                    <Icon name={chosenCategory?.icon ?? 'grid'} size={20} color={chosenCategory ? 'white' : colors.text} decorative />
                    <ThemedText maxFontSizeMultiplier={1.2} type="small" style={{ color: chosenCategory ? 'white' : colors.text }}>
                      {chosenCategory ? chosenCategory.label() : t('cat.filter')}
                    </ThemedText>
                    <Icon name="chevron-down" size={20} color={chosenCategory ? 'white' : colors.textSecondary} decorative />
                  </Pressable>
                  {/* Sort: one pill that switches between the two orders. */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={sort ? t('list.sortEndActive') : t('list.sortNewActive')}
                    accessibilityState={{ selected: !!sort }}
                    onPress={() => setSort(sort ? '' : 'warrantyEnd')}
                    android_ripple={{ color: Brand.primary + '1F' }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: Spacing.two,
                      paddingHorizontal: Spacing.three,
                      minHeight: 44,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: sort ? Brand.primary : colors.border,
                      backgroundColor: sort ? Brand.primary : colors.backgroundElement,
                      opacity: pressed ? 0.85 : 1,
                    })}>
                    <Icon name="clock" size={20} color={sort ? 'white' : colors.text} decorative />
                    <ThemedText maxFontSizeMultiplier={1.2} type="small" style={{ color: sort ? 'white' : colors.text }}>
                      {sort ? t('list.sortEnd') : t('list.sortNew')}
                    </ThemedText>
                  </Pressable>
                  {chosenCategory && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('cat.filterAll')}
                      onPress={() => setCategory('')}
                      hitSlop={8}
                      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="x" size={20} color={colors.textSecondary} decorative />
                    </Pressable>
                  )}
                </View>
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
            renderItem={({ item }) => {
              if (item.kind === 'section') {
                const n = sectionCount(item.status);
                return (
                  <View accessible accessibilityRole="header" accessibilityLabel={statusWord(item.status) + (n !== null ? ': ' + n : '')} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.three, paddingBottom: Spacing.two }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: STATUS_FILL[item.status] }} />
                    <ThemedText type="small" themeColor="textSecondary" style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, flex: 1 }}>
                      {statusWord(item.status)}
                    </ThemedText>
                    {n !== null && (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: 999, backgroundColor: colors.backgroundSelected }}>
                        <ThemedText type="small" themeColor="textSecondary" style={{ fontWeight: '700' }}>
                          {n}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                );
              }
              const p = item.p;
              return (
                <SwipeableRow
                  ref={(inst) => {
                    if (inst) swipeRefs.current.set(p.id, inst);
                    else swipeRefs.current.delete(p.id);
                  }}
                  editLabel={t('detail.edit')}
                  deleteLabel={t('detail.delete')}
                  onEdit={() => router.push({ pathname: '/purchase/edit', params: { id: p.id } } as never)}
                  onDelete={() => deleteWithUndo(p.id)}
                  onWillOpen={() => {
                    swipeRefs.current.forEach((r, k) => {
                      if (k !== p.id) r.close();
                    });
                  }}>
                  <PurchaseRow
                    p={p}
                    onPress={() => router.push(('/purchase/' + p.id) as never)}
                    onEdit={() => router.push({ pathname: '/purchase/edit', params: { id: p.id } } as never)}
                    onDelete={() => deleteWithUndo(p.id)}
                  />
                </SwipeableRow>
              );
            }}
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
                  <Skeleton style={{ height: 130, borderRadius: Radius.md }} />
                  <Skeleton style={{ height: 130, borderRadius: Radius.md }} />
                  <Skeleton style={{ height: 130, borderRadius: Radius.md }} />
                </View>
              ) : list.isLoading ? null : filtering ? (
                <View style={{ gap: Spacing.three }}>
                  <EmptyState title={t('list.noResults')} help={t('list.noResultsHelp')} icon="search" />
                  <AppButton variant="secondary" title={t('list.clearFilters')} onPress={clearAll} />
                </View>
              ) : (
                <EmptyState title={t('empty.noPurchases')} help={t('empty.addFirst')} icon="package" />
              )
            }
            contentContainerStyle={{ paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: 120 }}
          />
          <AddFab />
          <CategorySheet
            visible={sheetOpen}
            value={category}
            onSelect={(k) => {
              setCategory(k);
              setSheetOpen(false);
            }}
            onClose={() => setSheetOpen(false)}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
