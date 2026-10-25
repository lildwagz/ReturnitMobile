import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StatusStyle, StatusStyleDark } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { STATUS_LABEL, WarrantyStatus } from '@/lib/warranty';

export function StatusBadge({ status }: { status: WarrantyStatus }) {
  const s = (useColorScheme() === 'dark' ? StatusStyleDark : StatusStyle)[status];
  return (
    <View
      style={{
        backgroundColor: s.bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
      }}>
      <ThemedText type="small" style={{ color: s.fg, fontWeight: 700 }}>
        {STATUS_LABEL[status]}
      </ThemedText>
    </View>
  );
}
