import { Pressable, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { t, tn } from '@/i18n';
import { Purchase } from '@/lib/purchase';
import { daysLeft, formatDate, formatIDR, warrantyStatus } from '@/lib/warranty';

const RETURN_NOTICE_DAYS = 14; // show the return deadline on the card from this many days before it

// One purchase card, shared by Home and the Pembelian list.
export function PurchaseRow({ p, onPress }: { p: Purchase; onPress: () => void }) {
  const status = warrantyStatus(p.warrantyEndDate);
  const left = daysLeft(p.warrantyEndDate);
  const returnLeft = daysLeft(p.returnDeadline);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('row.open', { name: p.productName })}>
      <ThemedView
        type="backgroundElement"
        style={{ padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <ThemedText type="title" style={{ fontSize: 20, lineHeight: 26 }}>
            {p.productName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {(p.storeName ? p.storeName + ' · ' : '') + formatDate(p.purchaseDate)}
          </ThemedText>
          <ThemedText type="small">{formatIDR(p.price, p.currency)}</ThemedText>
          <StatusBadge status={status} />
          {returnLeft !== null && returnLeft >= 0 && returnLeft <= RETURN_NOTICE_DAYS && (
            <ThemedText type="small" themeColor={returnLeft <= 3 ? 'warningText' : 'textSecondary'}>
              {returnLeft === 0 ? t('row.returnToday') : tn('returnDaysLeft', returnLeft)}
            </ThemedText>
          )}
          {left !== null && (
            <ThemedText type="small" themeColor="textSecondary">
              {left >= 0 ? tn('daysLeft', left) : tn('endedDaysAgo', -left)}
            </ThemedText>
          )}
        </View>
        <ThemedText themeColor="textSecondary" style={{ fontSize: 24 }}>
          {t('row.chevron')}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}
