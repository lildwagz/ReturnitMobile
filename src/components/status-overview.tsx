import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import type { WarrantyStatus } from '@/lib/warranty';

export type Counts = { active: number; expiring: number; expired: number; unknown: number; total: number };

// The fill of each warranty status in bars and dots. Stronger than the tints of the badges, and the same in both themes.
export const STATUS_FILL: Record<WarrantyStatus, string> = {
  active: '#16A34A',
  expiring: '#D97706',
  expired: '#DC2626',
  unknown: '#94A3B8',
};

const ORDER: WarrantyStatus[] = ['active', 'expiring', 'expired', 'unknown'];

export function statusWord(s: WarrantyStatus): string {
  return s === 'active' ? t('ov.legendActive') : s === 'expiring' ? t('ov.legendExpiring') : s === 'expired' ? t('ov.legendExpired') : t('ov.legendNone');
}

// One bar for the whole list: how many purchases are active, expiring, expired or without a date, side by side.
// Decorative: the numbers are written next to it (legend or chips).
export function StatusBar({ counts, height = 10 }: { counts: Counts; height?: number }) {
  const theme = useTheme();
  const parts = ORDER.map((s) => ({ s, n: counts[s] })).filter((p) => p.n > 0);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', height, borderRadius: height / 2, overflow: 'hidden', gap: 2, backgroundColor: theme.backgroundSelected }}>
      {parts.map((p) => (
        <View key={p.s} style={{ flex: p.n, backgroundColor: STATUS_FILL[p.s] }} />
      ))}
    </View>
  );
}

// The same four counts with their colour, two per row.
export function StatusLegend({ counts }: { counts: Counts }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.two, columnGap: Spacing.three }}>
      {ORDER.map((s) => (
        <View key={s} accessible accessibilityLabel={statusWord(s) + ': ' + counts[s]} style={{ flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: STATUS_FILL[s] }} />
          <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }} numberOfLines={1}>
            {statusWord(s)}
          </ThemedText>
          <ThemedText style={{ fontWeight: '700' }}>{counts[s]}</ThemedText>
        </View>
      ))}
    </View>
  );
}
