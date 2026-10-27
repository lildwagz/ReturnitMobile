import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing, StatusStyle, StatusStyleDark } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { statusLabel, WarrantyStatus } from '@/lib/warranty';

// Same marks as the prototype, so the status is not carried by color alone.
const ICON: Record<WarrantyStatus, 'check' | 'clock' | 'alert-circle' | 'circle'> = {
  active: 'check',
  expiring: 'clock',
  expired: 'alert-circle',
  unknown: 'circle',
};

export function StatusBadge({ status }: { status: WarrantyStatus }) {
  const schemeDark = useColorScheme() === 'dark';
  const s = (schemeDark ? StatusStyleDark : StatusStyle)[status];
  return (
    <View
      style={{
        backgroundColor: s.bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one,
      }}>
      <Icon name={ICON[status]} size={20} color={s.fg} decorative />
      <ThemedText type="small" style={{ color: s.fg, fontWeight: 700 }}>
        {statusLabel(status)}
      </ThemedText>
    </View>
  );
}
