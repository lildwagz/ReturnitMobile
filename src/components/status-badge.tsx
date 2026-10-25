import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StatusStyle, StatusStyleDark } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { STATUS_LABEL, WarrantyStatus } from '@/lib/warranty';

// Same marks as the prototype, so the status is not carried by color alone.
const ICON: Record<WarrantyStatus, string> = { active: '✓', expiring: '◷', expired: '!', unknown: '•' };

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
        {ICON[status] + ' ' + STATUS_LABEL[status]}
      </ThemedText>
    </View>
  );
}
