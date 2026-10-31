import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddFab } from '@/components/add-fab';
import { AppButton } from '@/components/app-button';
import { EmptyState } from '@/components/empty-state';
import { PurchaseRow } from '@/components/purchase-row';
import { Skeleton, SkeletonTile } from '@/components/skeleton';
import { SwipeableRow } from '@/components/swipeable-row';
import { Tile, TileLabel } from '@/components/tile';
import { UpdateBanner } from '@/components/update-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Brand, MaxContentWidth, Radius, Spacing, TypeScale } from '@/constants/theme';
import { t, tn } from '@/i18n';
import { addDateToCalendar } from '@/lib/calendar';
import { deleteWithUndo, usePendingDeletes } from '@/lib/pending-delete';
import { Summary, useAccountQuery, useHomeData, useRefetchStaleOnFocus } from '@/lib/queries';
import { showToast } from '@/lib/toast';
import { daysLeft, formatDate, formatIDR } from '@/lib/warranty';
import { keys } from '@/lib/query-client';
import { useSignedIn } from '@/lib/use-signed-in';

// The one deadline that comes first: the nearer of the next warranty end and the next return.
type Hero = {
  id: string;
  name: string;
  date: string;
  kind: 'warranty' | 'return';
  left: number;
};

function pickHero(summary: Summary): Hero | null {
  const kind = (item: Summary['nextExpiring'] | Summary['nextReturn'], kindOf: Hero['kind']) =>
    !item || daysLeft(item.date) === null
      ? null
      : { id: item.id, name: item.productName, date: item.date, kind: kindOf, left: daysLeft(item.date) as number };
  const warranty = kind(summary.nextExpiring, 'warranty');
  const back = kind(summary.nextReturn, 'return');
  if (warranty && back) return warranty.left <= back.left ? warranty : back;
  if (warranty) return warranty;
  if (back) return back;
  return null;
}

// The countdown number: "today" when the deadline is today. Void when it is already in the past.
function countdown(left: number): string | null {
  if (left < 0) return null;
  return left === 0 ? t('home.today') : tn('daysLeft', left);
}

// Needs-attention hero: label, product name, the large countdown, Open and Add to calendar.
function AttentionHero({ hero, onOpen }: { hero: Hero; onOpen: (id: string) => void }) {
  const theme = useTheme();
  const text = countdown(hero.left);
  const calendarTitle =
    hero.kind === 'warranty'
      ? t('detail.calWarrantyTitle', { name: hero.name })
      : t('detail.calReturnTitle', { name: hero.name });
  return (
    <Tile
      padding={Spacing.four}
      onPress={() => onOpen(hero.id)}
      accessibilityLabel={
        t('row.a11y', {
          name: hero.name,
          status: hero.kind === 'warranty' ? t('home.nextExpiring') : t('home.nextReturn'),
          days: tn('daysLeft', hero.left),
        })
      }
      style={{
        borderStartWidth: Spacing.one,
        borderStartColor: hero.kind === 'warranty' ? Brand.warning : Brand.primary,
      }}>
      <ThemedText type="small" themeColor="textSecondary" style={{ textTransform: 'uppercase' }}>
        {t('home.needsAttention')}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {hero.kind === 'warranty' ? t('home.nextExpiring') : t('home.nextReturn')} · {formatDate(hero.date)}
      </ThemedText>
      <ThemedText numberOfLines={2} style={{ fontSize: TypeScale.lg, lineHeight: 26, fontWeight: '700' }}>
        {hero.name}
      </ThemedText>
      {text && (
        <ThemedText
          maxFontSizeMultiplier={1.2}
          style={{
            fontSize: TypeScale.big,
            lineHeight: 44,
            fontWeight: '700',
            // Amber only when it is urgent (30 days or less for a warranty); a date far in the
            // future stays plain, so the colour keeps meaning something.
            color: hero.kind === 'warranty' && hero.left <= 30 ? theme.warningText : theme.text,
          }}>
          {text}
        </ThemedText>
      )}
      <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one }}>
        <View style={{ flex: 1 }}>
          <AppButton small title={t('home.open')} onPress={() => onOpen(hero.id)} />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton
            small
            variant="secondary"
            title={t('home.addCalendar')}
            onPress={async () => {
              const r = await addDateToCalendar({ title: calendarTitle, date: hero.date, notes: t('detail.calNotes') });
              // 'canceled' is the person deciding not to save: no message, like the detail screen.
              if (r === 'error') showToast(t('detail.calendarFailed'));
              else if (r === 'saved') showToast(t('detail.calendarAdded'));
            }}
          />
        </View>
      </View>
    </Tile>
  );
}

// Half-width number tile: one big number (the design's "one large number per tile"). The number stays on one
// line: short values (counts) are big, longer ones (dates) use the 20 pt size, and either shrinks a little
// rather than wrapping when the screen is narrow.
function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'successText' | 'warningText' }) {
  const big = value.length <= 8;
  return (
    <Tile>
      <ThemedText
        type="title"
        themeColor={tone ?? 'text'}
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={big ? { fontSize: TypeScale.big, lineHeight: 44 } : { fontSize: TypeScale.lg, lineHeight: 28 }}>
        {value}
      </ThemedText>
      <TileLabel>{label}</TileLabel>
    </Tile>
  );
}

// "Rp450.000.000" -> the currency mark and the digits, so the mark can be small and the amount large.
function splitAmount(text: string): { mark: string; digits: string } {
  const m = text.match(/^(\D*)(\d.*)$/);
  return m ? { mark: m[1].trim(), digits: m[2] } : { mark: '', digits: text };
}

// Full-width tile for the money still under warranty. A sum of hundreds of millions does not fit in a half tile,
// so it gets the whole row: one line per currency, the amount large, the currency mark small, shrinking only
// when a very large sum needs it (never wrapping). A screen reader reads the full amount.
function ValueTile({ label, amounts }: { label: string; amounts: { amount: number; currency: string }[] }) {
  const lines = amounts.map((a) => ({ key: a.currency, text: formatIDR(a.amount, a.currency) }));
  return (
    <View accessible accessibilityLabel={label + ': ' + lines.map((l) => l.text).join(', ')}>
      <Tile>
        <TileLabel>{label}</TileLabel>
        {lines.map((l) => {
          const { mark, digits } = splitAmount(l.text);
          return (
            <ThemedText
              key={l.key}
              type="title"
              maxFontSizeMultiplier={1.2}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={{ fontSize: TypeScale.title, lineHeight: 36 }}>
              {mark ? (
                <ThemedText themeColor="textSecondary" style={{ fontSize: TypeScale.base, fontWeight: 500 }}>
                  {mark + ' '}
                </ThemedText>
              ) : null}
              {digits}
            </ThemedText>
          );
        })}
      </Tile>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const signedIn = useSignedIn() === true; // the tabs only exist while signed in
  const { summary, active, expiring, total, recent: allRecent, error, loading, refetch } = useHomeData(signedIn);
  const pendingDelete = usePendingDeletes(); // swiped away, waiting out the Undo time
  const recent = allRecent.filter((p) => !pendingDelete.has(p.id));
  useRefetchStaleOnFocus(keys.purchases);
  // The first word of the account name (from Keycloak or Google), for the greeting; nothing until it is known.
  const account = useAccountQuery<{ displayName?: string | null }>(signedIn);
  const firstName = account.data?.displayName?.trim().split(/\s+/)[0];

  const hero = summary ? pickHero(summary) : null;

  // Only one swipeable row may stay open: opening one closes the previous.
  const swipeRefs = useRef(new Map<string, { close: () => void }>());

  const covered = summary?.coveredValue ?? [];
  const tileRows: { key: string; label: string; value: string; tone?: 'successText' | 'warningText' }[] = [];
  if (active !== null) tileRows.push({ key: 'active', label: t('home.active'), value: String(active), tone: 'successText' });
  if (expiring !== null) tileRows.push({ key: 'expiring', label: t('home.expiring'), value: String(expiring), tone: 'warningText' });
  if (total !== null) tileRows.push({ key: 'total', label: t('home.total'), value: String(total) });
  // The return tile repeats the hero when the hero already is the return deadline, so it only
  // shows beside a warranty hero.
  if (summary?.nextReturn && hero && hero.kind !== 'return') {
    tileRows.push({ key: 'return', label: t('home.nextReturn'), value: formatDate(summary.nextReturn.date) });
  }

  const bentoLoading = loading && !summary;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Wide screens: same readable width as the lists. */}
        <View style={{ maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: 120 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}>
          <View style={{ gap: Spacing.one }}>
            <ThemedText type="title">{firstName ? t('home.helloName', { name: firstName }) : t('home.hello')}</ThemedText>
            <ThemedText themeColor="textSecondary">{t('home.tagline')}</ThemedText>
          </View>
          <UpdateBanner />

          {error && (
            <View style={{ gap: Spacing.two }}>
              <ThemedText type="small" themeColor="errorText">
                {error}
              </ThemedText>
              <AppButton variant="secondary" title={t('home.retry')} onPress={refetch} />
            </View>
          )}

          {bentoLoading ? (
            <View style={{ gap: Spacing.two }}>
              <SkeletonTile height={128} radius={Radius.md} />
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                <SkeletonTile height={88} />
                <SkeletonTile height={88} />
              </View>
            </View>
          ) : (
            hero && <AttentionHero hero={hero} onOpen={(id) => router.push(('/purchase/' + id) as never)} />
          )}

          {!bentoLoading && covered.length > 0 && <ValueTile label={t('home.coveredValue')} amounts={covered} />}

          {!bentoLoading && tileRows.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
              {tileRows.map((row) => (
                <View key={row.key} style={{ flexBasis: '48%', flexGrow: 1 }}>
                  <StatTile label={row.label} value={row.value} tone={row.tone} />
                </View>
              ))}
            </View>
          )}

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
          ) : loading && recent.length === 0 ? (
            <View style={{ gap: Spacing.two }}>
              <Skeleton style={{ height: 76, borderRadius: Radius.md }} />
              <Skeleton style={{ height: 76, borderRadius: Radius.md }} />
            </View>
          ) : (
            recent.map((p) => (
              <SwipeableRow
                key={p.id}
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
            ))
          )}
        </ScrollView>

        {/* Floating "+": the one primary action on Home and Purchases alike. */}
        <AddFab />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
