import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { I18nManager, Pressable, RefreshControl, ScrollView, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddFab } from '@/components/add-fab';
import { AppButton } from '@/components/app-button';
import { BellButton } from '@/components/bell-button';
import { Avatar } from '@/components/bucket-ui';
import { BucketChips } from '@/components/bucket-chips';
import { Icon, type FeatherName } from '@/components/icon';
import { PendingInviteBanner } from '@/components/pending-invite-banner';
import { PurchaseRow } from '@/components/purchase-row';
import { Skeleton, SkeletonTile } from '@/components/skeleton';
import { StatusBar, StatusLegend } from '@/components/status-overview';
import { SwipeableRow } from '@/components/swipeable-row';
import { Tile } from '@/components/tile';
import { UpdateBanner } from '@/components/update-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { BannerStyle, BannerStyleDark, Brand, MaxContentWidth, Radius, Spacing, TypeScale } from '@/constants/theme';
import { currentLanguage, t, tn } from '@/i18n';
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

// "Thursday, 5 November" in the app language.
function todayLine(): string {
  const lang = currentLanguage();
  const locale = lang === 'id' ? 'id-ID' : lang === 'ar' ? 'ar' : 'en-US';
  try {
    return new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

// The greeting: the person's initial in a coloured circle, the name, today's date, and the bell with the unread count.
function Greeting({ name, id }: { name?: string; id?: string }) {
  const date = todayLine();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
      <Avatar id={id ?? name ?? 'me'} name={name ?? '?'} size={44} />
      <View style={{ flex: 1 }}>
        <ThemedText accessibilityRole="header" numberOfLines={1} style={{ fontSize: 22, lineHeight: 28, fontWeight: '700' }}>
          {name ? t('ov.helloName', { name }) : t('ov.hello')}
        </ThemedText>
        {date ? (
          <ThemedText type="small" themeColor="textSecondary">
            {date}
          </ThemedText>
        ) : null}
      </View>
      <BellButton />
    </View>
  );
}

// Needs-attention hero: what is next, how many days, and two actions. A warranty within 30 days (or a return within a week) is
// warm and loud; a date further away stays plain, so the colour keeps meaning something.
function AttentionHero({ hero, onOpen }: { hero: Hero; onOpen: (id: string) => void }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const urgent = hero.kind === 'warranty' ? hero.left <= 30 : hero.left <= 7;
  const warm = (dark ? BannerStyleDark : BannerStyle).expiring;
  const calm = hero.kind === 'return';
  const fg = urgent ? warm.fg : calm ? (dark ? '#BFDBFE' : Brand.primaryDark) : theme.text;
  const iconBg = urgent ? '#D97706' : calm ? Brand.primary : theme.textSecondary;
  const calendarTitle =
    hero.kind === 'warranty' ? t('detail.calWarrantyTitle', { name: hero.name }) : t('detail.calReturnTitle', { name: hero.name });
  const unit = hero.left === 0 ? '' : t('row.daysUnit');
  const big = hero.left === 0 ? t('home.today') : String(Math.max(hero.left, 0));
  return (
    <Tile
      padding={Spacing.three + 2}
      gap={Spacing.three}
      onPress={() => onOpen(hero.id)}
      accessibilityLabel={t('row.a11y', {
        name: hero.name,
        status: hero.kind === 'warranty' ? t('home.nextExpiring') : t('home.nextReturn'),
        days: tn('daysLeft', hero.left),
      })}
      style={{
        borderRadius: Radius.xl,
        backgroundColor: urgent ? warm.bg : calm ? (dark ? '#172554' : '#EFF6FF') : theme.backgroundElement,
        borderColor: urgent ? warm.border : calm ? (dark ? '#1E3A8A' : '#BFDBFE') : theme.border,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: iconBg }}>
          <Icon name={hero.kind === 'warranty' ? 'clock' : 'rotate-ccw'} size={20} color="#FFFFFF" decorative />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="small" style={{ color: fg, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {t('home.needsAttention')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {hero.kind === 'warranty' ? t('home.nextExpiring') : t('home.nextReturn')}
          </ThemedText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <ThemedText maxFontSizeMultiplier={1.2} style={{ color: fg, fontWeight: '700', fontSize: hero.left === 0 ? 20 : TypeScale.big, lineHeight: 42 }}>
            {big}
          </ThemedText>
          {unit ? (
            <ThemedText type="small" style={{ color: fg, fontWeight: '700' }}>
              {unit}
            </ThemedText>
          ) : null}
        </View>
      </View>
      <View style={{ gap: 2 }}>
        <ThemedText numberOfLines={2} style={{ fontSize: TypeScale.lg, lineHeight: 26, fontWeight: '700' }}>
          {hero.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('row.ends', { date: formatDate(hero.date) })}
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <View style={{ flex: 1 }}>
          <AppButton title={t('home.open')} onPress={() => onOpen(hero.id)} />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton
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

// "Rp450.000.000" -> the currency mark and the digits, so the mark can be small and the amount large.
function splitAmount(text: string): { mark: string; digits: string } {
  const m = text.match(/^(\D*)(\d.*)$/);
  return m ? { mark: m[1].trim(), digits: m[2] } : { mark: '', digits: text };
}

// One card for the whole picture: the money still under warranty, a bar of how the purchases divide by status, and the counts.
// A sum of hundreds of millions gets its own line per currency and shrinks rather than wraps. A screen reader reads the sentence.
function SummaryCard({ summary }: { summary: Summary }) {
  const covered = summary.coveredValue;
  const c = summary.counts;
  const lines = covered.map((a) => formatIDR(a.amount, a.currency));
  return (
    <View
      accessible
      accessibilityLabel={
        (lines.length ? t('home.coveredValue') + ': ' + lines.join(', ') + '. ' : '') +
        t('ov.totalLine', { n: c.total }) +
        ': ' +
        [t('ov.legendActive') + ' ' + c.active, t('ov.legendExpiring') + ' ' + c.expiring, t('ov.legendExpired') + ' ' + c.expired, t('ov.legendNone') + ' ' + c.unknown].join(', ')
      }>
      <Tile padding={Spacing.three + 2} gap={Spacing.three}>
        <View style={{ gap: 2 }}>
          <ThemedText type="small" themeColor="textSecondary" style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {lines.length ? t('home.coveredValue') : t('ov.totalLine', { n: c.total })}
          </ThemedText>
          {lines.map((text, i) => {
            const { mark, digits } = splitAmount(text);
            return (
              <ThemedText key={covered[i].currency} maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontSize: 30, lineHeight: 38, fontWeight: '700' }}>
                {mark ? (
                  <ThemedText themeColor="textSecondary" style={{ fontSize: TypeScale.base, fontWeight: '500' }}>
                    {mark + ' '}
                  </ThemedText>
                ) : null}
                {digits}
              </ThemedText>
            );
          })}
        </View>
        <StatusBar counts={c} />
        <StatusLegend counts={c} />
      </Tile>
    </View>
  );
}

// A row with an icon tile, a label and a value: used for the nearest return deadline.
function InfoRow({ icon, label, value, onPress }: { icon: FeatherName; label: string; value: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Tile padding={Spacing.three} onPress={onPress} accessibilityLabel={label + ': ' + value}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <View style={{ width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.primarySoft }}>
          <Icon name={icon} size={20} color={Brand.primaryDark} decorative />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="small" themeColor="textSecondary">
            {label}
          </ThemedText>
          <ThemedText numberOfLines={2} style={{ fontWeight: '700' }}>
            {value}
          </ThemedText>
        </View>
        <Icon name="chevron-right" size={20} color={theme.textSecondary} flip={I18nManager.isRTL} decorative />
      </View>
    </Tile>
  );
}

// The first screen for someone with no purchases yet: one call to action and what happens next, in three steps.
function Welcome({ onAdd }: { onAdd: () => void }) {
  const theme = useTheme();
  const steps: { icon: FeatherName; title: string; help: string }[] = [
    { icon: 'plus', title: t('ov.s1'), help: t('ov.s1h') },
    { icon: 'camera', title: t('ov.s2'), help: t('ov.s2h') },
    { icon: 'bell', title: t('ov.s3'), help: t('ov.s3h') },
  ];
  return (
    <>
      <View style={{ borderRadius: Radius.xl, padding: Spacing.four, backgroundColor: Brand.primary, overflow: 'hidden', gap: Spacing.two }}>
        {/* two soft circles, the only decoration */}
        <View pointerEvents="none" style={{ position: 'absolute', end: -36, top: -48, width: 150, height: 150, borderRadius: 75, backgroundColor: '#FFFFFF1A' }} />
        <View pointerEvents="none" style={{ position: 'absolute', end: 40, bottom: -40, width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFFFFF1A' }} />
        <ThemedText accessibilityRole="header" style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 22, lineHeight: 28, maxWidth: 250 }}>
          {t('ov.welcomeTitle')}
        </ThemedText>
        <ThemedText style={{ color: '#FFFFFFE6', fontSize: 14, lineHeight: 20, maxWidth: 270 }}>{t('ov.welcomeHelp')}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ov.welcomeCta')}
          onPress={onAdd}
          android_ripple={{ color: Brand.primary + '33' }}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 18,
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            marginTop: Spacing.one,
            opacity: pressed ? 0.9 : 1,
          })}>
          <Icon name="plus" size={20} color={Brand.primaryDark} decorative />
          <ThemedText style={{ color: Brand.primaryDark, fontWeight: '700' }}>{t('ov.welcomeCta')}</ThemedText>
        </Pressable>
      </View>
      <ThemedText accessibilityRole="header" type="small" themeColor="textSecondary" style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {t('ov.stepsTitle')}
      </ThemedText>
      <Tile padding={Spacing.three} gap={Spacing.three}>
        {steps.map((s, i) => (
          <View key={s.title} style={{ flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.backgroundSelected, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={s.icon} size={20} color={theme.primary} decorative />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText style={{ fontWeight: '700' }}>
                {i + 1}. {s.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {s.help}
              </ThemedText>
            </View>
          </View>
        ))}
      </Tile>
    </>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const signedIn = useSignedIn() === true; // the tabs only exist while signed in
  const { summary, recent: allRecent, error, loading, refetch } = useHomeData(signedIn);
  const pendingDelete = usePendingDeletes(); // swiped away, waiting out the Undo time
  const recent = allRecent.filter((p) => !pendingDelete.has(p.id));
  useRefetchStaleOnFocus(keys.purchases);
  // The first word of the account name (from Keycloak or Google), for the greeting; nothing until it is known.
  const account = useAccountQuery<{ id?: string; displayName?: string | null }>(signedIn);
  const firstName = account.data?.displayName?.trim().split(/\s+/)[0];
  const [addOpen, setAddOpen] = useState(false);

  const hero = summary ? pickHero(summary) : null;

  // Only one swipeable row may stay open: opening one closes the previous.
  const swipeRefs = useRef(new Map<string, { close: () => void }>());

  const bentoLoading = loading && !summary;
  const empty = !!summary && summary.counts.total === 0 && recent.length === 0 && !error;
  // The return deadline row repeats the hero when the hero already is the return deadline, so it only shows beside a warranty hero.
  const showReturnRow = !!summary?.nextReturn && !!hero && hero.kind !== 'return';

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Wide screens: same readable width as the lists. */}
        <View style={{ maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: 120 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}>
          <Greeting name={firstName} id={account.data?.id} />
          <UpdateBanner />
          <PendingInviteBanner />
          <BucketChips />

          {error && (
            <View style={{ gap: Spacing.two }}>
              <ThemedText type="small" themeColor="errorText">
                {error}
              </ThemedText>
              <AppButton variant="secondary" title={t('home.retry')} onPress={refetch} />
            </View>
          )}

          {empty ? (
            <Welcome onAdd={() => setAddOpen(true)} />
          ) : bentoLoading ? (
            <View style={{ gap: Spacing.three }}>
              <SkeletonTile height={190} radius={Radius.xl} />
              <SkeletonTile height={210} radius={Radius.md} />
            </View>
          ) : (
            <>
              {hero && <AttentionHero hero={hero} onOpen={(id) => router.push(('/purchase/' + id) as never)} />}
              {summary && summary.counts.total > 0 && <SummaryCard summary={summary} />}
              {showReturnRow && summary?.nextReturn && (
                <InfoRow
                  icon="rotate-ccw"
                  label={t('home.nextReturn')}
                  value={formatDate(summary.nextReturn.date) + ' · ' + summary.nextReturn.productName}
                  onPress={() => router.push(('/purchase/' + summary.nextReturn!.id) as never)}
                />
              )}
            </>
          )}

          {!empty && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.one }}>
              <ThemedText accessibilityRole="header" type="subtitle" style={{ fontSize: 18, lineHeight: 24 }}>
                {t('home.recent')}
              </ThemedText>
              {recent.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('ov.seeAll')}
                  onPress={() => router.push('/purchases' as never)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                  <ThemedText type="linkPrimary" style={{ fontWeight: '700' }}>
                    {t('ov.seeAll')}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )}
          {!empty &&
            (loading && recent.length === 0 ? (
              <View style={{ gap: Spacing.two }}>
                <Skeleton style={{ height: 120, borderRadius: Radius.md }} />
                <Skeleton style={{ height: 120, borderRadius: Radius.md }} />
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
            ))}
          </ScrollView>

          {/* Floating "+": the one primary action on Home and Purchases alike. The welcome button opens the same sheet. */}
          <AddFab visible={addOpen} onChange={setAddOpen} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
