import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { EmptyState } from '@/components/empty-state';
import { PurchaseRow } from '@/components/purchase-row';
import { UpdateBanner } from '@/components/update-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BannerStyle, BannerStyleDark } from '@/constants/theme';
import { t, tn } from '@/i18n';
import { Summary, useAccountQuery, useHomeData, useRefetchStaleOnFocus } from '@/lib/queries';
import { daysLeft, formatDate, formatIDR } from '@/lib/warranty';
import { keys } from '@/lib/query-client';
import { useSignedIn } from '@/lib/use-signed-in';

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

// What matters next: the money still covered and the two dates that come up soonest. Each date opens its purchase.
function Highlights({ summary, onOpen }: { summary: Summary; onOpen: (id: string) => void }) {
  const rows: { key: string; label: string; value: string; id?: string }[] = [];
  if (summary.coveredValue.length > 0) {
    rows.push({
      key: 'value',
      label: t('home.coveredValue'),
      value: summary.coveredValue.map((a) => formatIDR(a.amount, a.currency)).join(' · '),
    });
  }
  const dated = (label: string, item: Summary['nextExpiring'], key: string) => {
    if (!item) return;
    const left = daysLeft(item.date)!;
    rows.push({
      key,
      label,
      id: item.id,
      value: item.productName + ' · ' + formatDate(item.date) + ' (' + (left === 0 ? t('home.today') : tn('daysLeft', left)) + ')',
    });
  };
  dated(t('home.nextExpiring'), summary.nextExpiring, 'expiring');
  dated(t('home.nextReturn'), summary.nextReturn, 'return');
  if (rows.length === 0) return null;
  return (
    <ThemedView type="backgroundElement" style={{ borderRadius: 16, padding: 14, gap: 12 }}>
      {rows.map((r) => (
        <Pressable key={r.key} disabled={!r.id} onPress={() => r.id && onOpen(r.id)} style={{ gap: 2 }}>
          <ThemedText type="small" themeColor="textSecondary">
            {r.label}
          </ThemedText>
          <ThemedText style={{ fontWeight: 700 }}>{r.value}</ThemedText>
        </Pressable>
      ))}
    </ThemedView>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const signedIn = useSignedIn() === true; // the tabs only exist while signed in
  const { summary, active, expiring, total, recent, error, loading, refetch } = useHomeData(signedIn);
  useRefetchStaleOnFocus(keys.purchases);
  // The first word of the account name (from Keycloak or Google), for the greeting; nothing until it is known.
  const account = useAccountQuery<{ displayName?: string | null }>(signedIn);
  const firstName = account.data?.displayName?.trim().split(/s+/)[0];

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}>
          <View style={{ gap: 4 }}>
            <ThemedText type="title">{firstName ? t('home.helloName', { name: firstName }) : t('home.hello')}</ThemedText>
            <ThemedText themeColor="textSecondary">{t('home.tagline')}</ThemedText>
          </View>
          <UpdateBanner />
          <AppButton title={t('home.add')} onPress={() => router.push('/purchase/new' as never)} />

          {error && (
            <View style={{ gap: 8 }}>
              <ThemedText type="small" themeColor="errorText">
                {error}
              </ThemedText>
              <AppButton variant="secondary" title={t('home.retry')} onPress={refetch} />
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat label={t('home.active')} value={active} tone="successText" />
            <Stat label={t('home.expiring')} value={expiring} tone="warningText" />
            <Stat label={t('home.total')} value={total} />
          </View>
          {summary && <Highlights summary={summary} onOpen={(id) => router.push(('/purchase/' + id) as never)} />}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText type="subtitle" style={{ fontSize: 18, lineHeight: 24 }}>
              {t('home.recent')}
            </ThemedText>
            {recent.length > 0 && (
              <AppButton small variant="secondary" title={t('home.seeAll')} onPress={() => router.push('/purchases' as never)} />
            )}
          </View>
          {recent.length === 0 && !loading && !error ? (
            <EmptyState title={t('empty.noPurchases')} help={t('empty.addFirst')} />
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
