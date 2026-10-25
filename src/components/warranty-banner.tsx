import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BannerStyle, BannerStyleDark } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { WarrantyStatus, daysLeft, formatDate } from '@/lib/warranty';

const TITLE: Record<WarrantyStatus, string> = {
  active: 'Garansi masih aktif',
  expiring: 'Garansi segera berakhir',
  expired: 'Masa garansi telah berakhir',
  unknown: 'Tanggal garansi belum diketahui',
};

export function WarrantyBanner({ status, endDate }: { status: WarrantyStatus; endDate?: string | null }) {
  const s = (useColorScheme() === 'dark' ? BannerStyleDark : BannerStyle)[status];
  const left = daysLeft(endDate);
  const detail = endDate
    ? 'Tanggal akhir: ' +
      formatDate(endDate) +
      (left === null ? '' : left >= 0 ? ' · ' + left + ' hari lagi' : ' · berakhir ' + -left + ' hari lalu')
    : 'Tambahkan durasi garansi untuk menghitung tanggal akhir.';
  return (
    <View style={{ backgroundColor: s.bg, borderColor: s.border, borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 }}>
      <ThemedText style={{ color: s.fg, fontWeight: 700 }}>{TITLE[status]}</ThemedText>
      <ThemedText type="small" style={{ color: s.fg }}>
        {detail}
      </ThemedText>
    </View>
  );
}
