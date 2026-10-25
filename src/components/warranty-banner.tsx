import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BannerStyle, BannerStyleDark } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { t, tn, type Key } from '@/i18n';
import { WarrantyStatus, daysLeft, formatDate } from '@/lib/warranty';

// The return deadline: calm while there is time, amber in the last 3 days, plain grey once it has passed.
export function ReturnBanner({ date }: { date: string }) {
  const s = (useColorScheme() === 'dark' ? BannerStyleDark : BannerStyle)[
    daysLeft(date)! < 0 ? 'unknown' : daysLeft(date)! <= 3 ? 'expiring' : 'active'
  ];
  const left = daysLeft(date)!;
  const title = left < 0 ? t('banner.returnPassed') : left === 0 ? t('banner.returnToday') : t('banner.return');
  const detail =
    formatDate(date) + (left > 0 ? tn('suffixLeft', left) : left < 0 ? tn('suffixEnded', -left) : '');
  return (
    <View style={{ backgroundColor: s.bg, borderColor: s.border, borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 }}>
      <ThemedText style={{ color: s.fg, fontWeight: 700 }}>{title}</ThemedText>
      <ThemedText type="small" style={{ color: s.fg }}>
        {detail}
      </ThemedText>
    </View>
  );
}

export function WarrantyBanner({ status, endDate }: { status: WarrantyStatus; endDate?: string | null }) {
  const s = (useColorScheme() === 'dark' ? BannerStyleDark : BannerStyle)[status];
  const left = daysLeft(endDate);
  const detail = endDate
    ? t('banner.endDate', { date: formatDate(endDate) }) +
      (left === null ? '' : left >= 0 ? tn('suffixLeft', left) : tn('suffixEnded', -left))
    : t('banner.addDuration');
  return (
    <View style={{ backgroundColor: s.bg, borderColor: s.border, borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 }}>
      <ThemedText style={{ color: s.fg, fontWeight: 700 }}>{t(('banner.' + status) as Key)}</ThemedText>
      <ThemedText type="small" style={{ color: s.fg }}>
        {detail}
      </ThemedText>
    </View>
  );
}
