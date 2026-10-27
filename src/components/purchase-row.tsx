import { Pressable, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, SoftShadow, Spacing, TypeScale } from '@/constants/theme';
import { t, tn } from '@/i18n';
import { Purchase } from '@/lib/purchase';
import { daysLeft, formatDate, formatIDR, statusLabel, warrantyStatus } from '@/lib/warranty';

const RETURN_NOTICE_DAYS = 14; // show the return deadline chip on the card from this many days before it

// The right-side countdown: the days as the largest element with a small unit under it.
// Colour follows the warranty status; with no warranty date (unknown) the number is omitted.
// Ended items show how long ago, with the expired colour.
function daysDisplay(p: Purchase): {
  status: ReturnType<typeof warrantyStatus>;
  numberText: string | null;
  unit: string | null;
  a11yDays: string | null;
} {
  const status = warrantyStatus(p.warrantyEndDate);
  const left = daysLeft(p.warrantyEndDate);
  if (left === null) return { status, numberText: null, unit: null, a11yDays: null };
  if (left < 0) {
    return { status, numberText: String(-left), unit: t('row.endedUnit'), a11yDays: tn('endedDaysAgo', -left) };
  }
  return {
    status,
    numberText: String(left),
    unit: t('row.daysUnit'),
    a11yDays: left === 0 ? t('home.today') : tn('daysLeft', left),
  };
}

// One purchase card, shared by Home and the Pembelian list: name, store and date on the left
// above the status pill; price secondary; the countdown large and coloured on the right; the
// return deadline as a small chip within its 14-day window. The screen-reader label summarises
// name, warranty status and days left. With `onEdit`/`onDelete` the row also exposes the same
// two actions as accessibility actions, so screen-reader users get what the swipe gives.
export function PurchaseRow({ p, onPress, onEdit, onDelete }: { p: Purchase; onPress: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const theme = useTheme();
  const { status, numberText, unit, a11yDays } = daysDisplay(p);
  const returnLeft = daysLeft(p.returnDeadline);
  const showReturn = returnLeft !== null && returnLeft >= 0 && returnLeft <= RETURN_NOTICE_DAYS;
  const numberColor =
    status === 'active' ? theme.successText : status === 'expiring' ? theme.warningText : status === 'expired' ? theme.errorText : theme.text;
  const label = a11yDays
    ? t('row.a11y', { name: p.productName, status: statusLabel(status), days: a11yDays })
    : t('row.a11yNoDays', { name: p.productName, status: statusLabel(status) });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
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
      style={({ pressed }) => [
        {
          backgroundColor: theme.backgroundElement,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: Radius.md,
          padding: Spacing.three,
          paddingBottom: Spacing.two,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.two,
          ...SoftShadow,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={{ flex: 1, gap: Spacing.one }}>
        <ThemedText numberOfLines={2} style={{ fontSize: TypeScale.base, lineHeight: 24, fontWeight: '700' }}>
          {p.productName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {(p.storeName ? p.storeName + ' · ' : '') + formatDate(p.purchaseDate)}
        </ThemedText>
        <View style={{ alignSelf: 'flex-start' }}>
          <StatusBadge status={status} />
        </View>
        {p.price !== null && p.price !== undefined && (
          <ThemedText type="small" themeColor="textSecondary">
            {formatIDR(p.price, p.currency)}
          </ThemedText>
        )}
        {showReturn && (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: theme.backgroundSelected,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 2,
            }}>
            <ThemedText type="small" style={{ color: theme.warningText }}>
              {returnLeft === 0 ? t('row.returnToday') : tn('returnDaysLeft', returnLeft)}
            </ThemedText>
          </View>
        )}
      </View>
      {numberText && (
        <View style={{ alignItems: 'flex-end', minWidth: 64 }}>
          <ThemedText maxFontSizeMultiplier={1.2} style={{ fontSize: TypeScale.big, lineHeight: 44, fontWeight: '700', color: numberColor }}>
            {numberText}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {unit}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}
