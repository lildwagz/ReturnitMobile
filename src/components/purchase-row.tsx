import { Platform, Pressable, View } from 'react-native';

import { bucketColor } from '@/components/bucket-ui';
import { Icon } from '@/components/icon';
import { STATUS_FILL } from '@/components/status-overview';
import { ThemedText } from '@/components/themed-text';
import { BannerStyle, BannerStyleDark, Brand, Radius, SoftShadow, Spacing, StatusStyle, StatusStyleDark } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { t, tn } from '@/i18n';
import { colorFor } from '@/lib/bucket-style';
import { bucketLabel, useBuckets } from '@/lib/buckets';
import { findCategory } from '@/lib/category';
import { Purchase } from '@/lib/purchase';
import { daysBetween, daysLeft, formatDate, formatIDR, statusLabel, todayLocal, warrantyStatus } from '@/lib/warranty';

const RETURN_NOTICE_DAYS = 14; // show the return deadline chip on the card from this many days before it

// The countdown block on the right: the days large with a small unit under it, tinted by the warranty status.
// With no warranty date (unknown) the block shows a dash. Ended items show how long ago.
function countdown(p: Purchase): {
  status: ReturnType<typeof warrantyStatus>;
  numberText: string;
  unit: string;
  a11yDays: string | null;
} {
  const status = warrantyStatus(p.warrantyEndDate);
  const left = daysLeft(p.warrantyEndDate);
  if (left === null) return { status, numberText: '–', unit: t('row.noEnd'), a11yDays: null };
  if (left < 0) return { status, numberText: String(-left), unit: t('row.endedUnit'), a11yDays: tn('endedDaysAgo', -left) };
  return { status, numberText: String(left), unit: t('row.daysUnit'), a11yDays: left === 0 ? t('home.today') : tn('daysLeft', left) };
}

// How much of the warranty has gone by, 0 to 1: the bar fills as the end gets closer. null without an end date.
function usedFraction(p: Purchase): number | null {
  if (!p.warrantyEndDate) return null;
  const start = p.warrantyStartDate ?? p.purchaseDate;
  const total = daysBetween(start, p.warrantyEndDate);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, daysBetween(start, todayLocal()) / total));
}

function Pill({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: bg }}>
      <ThemedText maxFontSizeMultiplier={1.2} type="small" style={{ color: fg, fontWeight: '700' }}>
        {text}
      </ThemedText>
    </View>
  );
}

// One purchase card, shared by Home and the Pembelian list. Left: the category tile in its own colour. Middle: name, store and
// date, then small tags (price, receipts, return deadline, bucket). Right: the countdown block. Under it all: a bar for how much
// of the warranty is used and when it ends. A card that is about to expire has a warm background; an ended one is paler.
// The screen-reader label summarises name, warranty status and days left. With `onEdit`/`onDelete` the card also exposes the
// same two actions as accessibility actions, so screen-reader users get what the swipe gives.
export function PurchaseRow({ p, onPress, onEdit, onDelete }: { p: Purchase; onPress: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const { status, numberText, unit, a11yDays } = countdown(p);
  const tint = (dark ? StatusStyleDark : StatusStyle)[status];
  const cat = findCategory(p.category);
  const accent = p.category ? colorFor(p.category) : theme.textSecondary;
  const receiptCount = p.receipts?.length ?? 0;
  const returnLeft = daysLeft(p.returnDeadline);
  const showReturn = returnLeft !== null && returnLeft >= 0 && returnLeft <= RETURN_NOTICE_DAYS;
  const used = usedFraction(p);

  const allBuckets = useBuckets(true).data;
  const sharedIn = bucketLabel(allBuckets, p.bucketId);
  const sharedColor = sharedIn ? bucketColor({ id: String(p.bucketId), personal: false }) : null;
  const bucketLine = sharedIn ? (p.addedBy && !p.addedByMe ? t('bk.rowBy', { bucket: sharedIn, name: p.addedBy }) : sharedIn) : null;

  const label = a11yDays
    ? t('row.a11y', { name: p.productName, status: statusLabel(status), days: a11yDays })
    : t('row.a11yNoDays', { name: p.productName, status: statusLabel(status) });
  const withBucket = bucketLine ? bucketLine + '. ' + label : label;
  const withCategory = cat ? cat.label() + '. ' + withBucket : withBucket;
  const a11yLabel = receiptCount ? withCategory + '. ' + tn('receipts', receiptCount) : withCategory;

  const warm = status === 'expiring' ? (dark ? BannerStyleDark : BannerStyle).expiring : null;
  const tags = [
    p.price !== null && p.price !== undefined ? <Pill key="price" text={formatIDR(p.price, p.currency)} bg={theme.backgroundSelected} fg={theme.textSecondary} /> : null,
    receiptCount > 0 ? <Pill key="rc" text={tn('receipts', receiptCount)} bg={theme.backgroundSelected} fg={theme.textSecondary} /> : null,
    showReturn ? (
      <Pill
        key="ret"
        text={returnLeft === 0 ? t('row.returnToday') : tn('returnDaysLeft', returnLeft)}
        bg={dark ? '#1E3A8A' : Brand.primarySoft}
        fg={dark ? '#BFDBFE' : Brand.primaryDark}
      />
    ) : null,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityActions={
        onEdit || onDelete
          ? [
              ...(onEdit ? [{ name: 'edit' as const, label: t('detail.edit') }] : []),
              ...(onDelete ? [{ name: 'delete' as const, label: t('detail.delete') }] : []),
            ]
          : undefined
      }
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'edit') onEdit?.();
        else if (e.nativeEvent.actionName === 'delete') onDelete?.();
      }}
      android_ripple={{ color: theme.primary + '1F' }}
      // No opacity change on press: on Android the ripple is the feedback, and fading an elevated card on every touch
      // forces an offscreen layer right when the finger lands, which made scrolling over the list stutter.
      style={({ pressed }) => [
        {
          backgroundColor: warm ? warm.bg : theme.backgroundElement,
          borderWidth: 1,
          borderColor: warm ? warm.border : theme.border,
          borderRadius: Radius.md,
          padding: Spacing.three,
          gap: Spacing.two + 2,
          ...SoftShadow,
          opacity: Platform.OS === 'ios' && pressed ? 0.85 : status === 'expired' ? 0.88 : 1,
        },
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: accent + '24' }}>
          <Icon name={cat?.icon ?? 'package'} size={20} color={accent} decorative />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText numberOfLines={2} style={{ fontSize: 15, lineHeight: 21, fontWeight: '700' }}>
            {p.productName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {(p.storeName ? p.storeName + ' · ' : '') + formatDate(p.purchaseDate)}
          </ThemedText>
        </View>
        <View
          style={{ width: 62, minHeight: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tint.bg, paddingVertical: 6, paddingHorizontal: 4 }}>
          <ThemedText maxFontSizeMultiplier={1.2} style={{ color: tint.fg, fontWeight: '700', fontSize: numberText.length > 3 ? 18 : 22, lineHeight: 26 }}>
            {numberText}
          </ThemedText>
          <ThemedText maxFontSizeMultiplier={1.1} numberOfLines={2} style={{ color: tint.fg, fontWeight: '700', fontSize: 10.5, lineHeight: 13, textAlign: 'center' }}>
            {unit}
          </ThemedText>
        </View>
      </View>

      {(tags.length > 0 || bucketLine) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two }}>
          {tags}
          {bucketLine && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sharedColor ?? theme.textSecondary }} />
              <ThemedText type="small" numberOfLines={1} style={{ flexShrink: 1, color: sharedColor ?? theme.textSecondary, fontWeight: '700' }}>
                {bucketLine}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      {used !== null && p.warrantyEndDate && (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <View style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: theme.backgroundSelected }}>
            <View style={{ width: `${Math.round(used * 100)}%`, height: 6, borderRadius: 3, backgroundColor: STATUS_FILL[status] }} />
          </View>
          <ThemedText type="small" themeColor="textSecondary" maxFontSizeMultiplier={1.2}>
            {t('row.ends', { date: formatDate(p.warrantyEndDate) })}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}
