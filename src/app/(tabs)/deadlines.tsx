import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { I18nManager, Pressable, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, SoftShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t, tn } from '@/i18n';
import { findCategory } from '@/lib/category';
import { Deadline, DeadlineGroup, groupDeadlines } from '@/lib/deadlines';
import { useDeadlines, useRefetchStaleOnFocus } from '@/lib/queries';
import { keys } from '@/lib/query-client';
import { useSignedIn } from '@/lib/use-signed-in';
import { daysLeft, formatDate } from '@/lib/warranty';

const SECTION_TITLE: Record<DeadlineGroup, () => string> = {
  week: () => t('dl.week'),
  month: () => t('dl.month'),
  later: () => t('dl.later'),
  passed: () => t('dl.passed'),
};

// "3 days left", "today", "5 days ago".
function whenText(date: string): string {
  const n = daysLeft(date) ?? 0;
  if (n === 0) return t('home.today');
  return n > 0 ? tn('daysLeft', n) : tn('endedDaysAgo', -n);
}

export default function DeadlinesScreen() {
  const router = useRouter();
  const signedIn = useSignedIn() === true; // the tabs only exist while signed in
  const list = useDeadlines(signedIn);
  useRefetchStaleOnFocus(keys.deadlines);

  // Grouped by the phone's own date, so "within 7 days" is right even when the phone is in another time zone.
  const sections = useMemo(() => groupDeadlines(list.data ?? []).map((s) => ({ ...s, title: SECTION_TITLE[s.group]() })), [list.data]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', flex: 1 }}>
          <SectionList
            sections={sections}
            keyExtractor={(d) => d.purchaseId + d.kind}
            stickySectionHeadersEnabled={false}
            ListHeaderComponent={
              <View style={{ gap: Spacing.one, paddingBottom: Spacing.two }}>
                <ThemedText type="title">{t('dl.title')}</ThemedText>
                <ThemedText themeColor="textSecondary">{t('dl.subtitle')}</ThemedText>
              </View>
            }
            renderSectionHeader={({ section }) => (
              <ThemedText accessibilityRole="header" type="small" themeColor="textSecondary" style={{ fontWeight: '700', paddingTop: Spacing.three, paddingBottom: Spacing.one }}>
                {section.title}
              </ThemedText>
            )}
            renderItem={({ item }) => <DeadlineRow item={item} onPress={() => router.push(('/purchase/' + item.purchaseId) as never)} />}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
            refreshing={list.isRefetching}
            onRefresh={() => list.refetch()}
            ListEmptyComponent={
              list.isLoading ? (
                <View style={{ gap: Spacing.two, paddingTop: Spacing.two }}>
                  <Skeleton style={{ height: 72, borderRadius: Radius.md }} />
                  <Skeleton style={{ height: 72, borderRadius: Radius.md }} />
                  <Skeleton style={{ height: 72, borderRadius: Radius.md }} />
                </View>
              ) : list.error ? (
                <View style={{ gap: Spacing.two, paddingTop: Spacing.two }}>
                  <ThemedText themeColor="errorText">{list.error.message}</ThemedText>
                  <AppButton variant="secondary" title={t('home.retry')} onPress={() => list.refetch()} />
                </View>
              ) : (
                <EmptyState title={t('dl.emptyTitle')} help={t('dl.emptyHelp')} icon="calendar" />
              )
            }
            contentContainerStyle={{ paddingHorizontal: Spacing.three, paddingBottom: 120 }}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

// One date: the category icon (or one for the kind), the product, what ends and when, and the countdown on the right.
function DeadlineRow({ item, onPress }: { item: Deadline; onPress: () => void }) {
  const theme = useTheme();
  const kind = item.kind === 'warranty' ? t('dl.kindWarranty') : t('dl.kindReturn');
  const when = whenText(item.date);
  const n = daysLeft(item.date) ?? 0;
  const color = n < 0 ? theme.errorText : n <= 7 ? theme.warningText : theme.successText;
  const icon = findCategory(item.category)?.icon ?? (item.kind === 'warranty' ? 'shield' : 'corner-up-left');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('dl.row', { name: item.productName, kind, date: formatDate(item.date), when })}
      onPress={onPress}
      android_ripple={{ color: theme.primary + '1F' }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        minHeight: 64,
        padding: Spacing.three,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.backgroundElement,
        ...SoftShadow,
        opacity: pressed ? 0.85 : 1,
      })}>
      <View style={{ width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundSelected }}>
        <Icon name={icon} size={20} color={theme.primary} decorative />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText numberOfLines={2} style={{ fontWeight: '700' }}>
          {item.productName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {kind + ' · ' + formatDate(item.date)}
        </ThemedText>
      </View>
      <ThemedText maxFontSizeMultiplier={1.2} type="small" style={{ color, fontWeight: '700' }}>
        {when}
      </ThemedText>
      <Icon name="chevron-right" size={20} color={theme.textSecondary} flip={I18nManager.isRTL} decorative />
    </Pressable>
  );
}
