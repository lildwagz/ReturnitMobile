import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Purchase } from '@/lib/purchase';
import { STATUS_LABEL, WarrantyStatus, daysLeft, formatIDR, warrantyStatus } from '@/lib/warranty';

const BADGE_COLOR: Record<WarrantyStatus, string> = {
  active: '#1B8A3A',
  expiring: '#C77700',
  expired: '#C62828',
  unknown: '#6B7280',
};

export function PurchaseRow({ p, onPress }: { p: Purchase; onPress: () => void }) {
  const status = warrantyStatus(p.warrantyEndDate);
  const left = daysLeft(p.warrantyEndDate);
  return (
    <Pressable onPress={onPress}>
      <ThemedView type="backgroundElement" style={{ padding: 16, borderRadius: 16, gap: 6 }}>
        <ThemedText type="title" style={{ fontSize: 20, lineHeight: 26 }}>
          {p.productName}
        </ThemedText>
        <ThemedText type="small">{(p.storeName ? p.storeName + ' - ' : '') + p.purchaseDate}</ThemedText>
        <ThemedText type="small">{formatIDR(p.price, p.currency)}</ThemedText>
        <View
          style={{
            backgroundColor: BADGE_COLOR[status],
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            alignSelf: 'flex-start',
          }}>
          <ThemedText type="small" style={{ color: 'white' }}>
            {STATUS_LABEL[status]}
          </ThemedText>
        </View>
        {left !== null && (
          <ThemedText type="small">
            {left >= 0 ? left + ' hari lagi' : 'Berakhir ' + -left + ' hari lalu'}
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}