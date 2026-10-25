import { Pressable } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Purchase } from '@/lib/purchase';
import { daysLeft, formatDate, formatIDR, warrantyStatus } from '@/lib/warranty';

export function PurchaseRow({ p, onPress }: { p: Purchase; onPress: () => void }) {
  const status = warrantyStatus(p.warrantyEndDate);
  const left = daysLeft(p.warrantyEndDate);
  return (
    <Pressable onPress={onPress}>
      <ThemedView type="backgroundElement" style={{ padding: 16, borderRadius: 16, gap: 6 }}>
        <ThemedText type="title" style={{ fontSize: 20, lineHeight: 26 }}>
          {p.productName}
        </ThemedText>
        <ThemedText type="small">{(p.storeName ? p.storeName + ' · ' : '') + formatDate(p.purchaseDate)}</ThemedText>
        <ThemedText type="small">{formatIDR(p.price, p.currency)}</ThemedText>
        <StatusBadge status={status} />
        {left !== null && (
          <ThemedText type="small">
            {left >= 0 ? left + ' hari lagi' : 'Berakhir ' + -left + ' hari lalu'}
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}