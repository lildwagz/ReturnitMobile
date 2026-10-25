import { Pressable, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Purchase } from '@/lib/purchase';
import { daysLeft, formatDate, formatIDR, warrantyStatus } from '@/lib/warranty';

// One purchase card, shared by Home and the Pembelian list.
export function PurchaseRow({ p, onPress }: { p: Purchase; onPress: () => void }) {
  const status = warrantyStatus(p.warrantyEndDate);
  const left = daysLeft(p.warrantyEndDate);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={'Buka detail ' + p.productName}>
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
          {left !== null && (
            <ThemedText type="small" themeColor="textSecondary">
              {left >= 0 ? left + ' hari lagi' : 'Berakhir ' + -left + ' hari lalu'}
            </ThemedText>
          )}
        </View>
        <ThemedText themeColor="textSecondary" style={{ fontSize: 24 }}>
          ›
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}
