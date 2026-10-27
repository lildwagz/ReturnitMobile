import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { BannerStyle, BannerStyleDark, Radius, SoftShadow, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { t, tn, type Key } from '@/i18n';
import { WarrantyStatus, daysLeft, formatDate } from '@/lib/warranty';

// The calendar icon button that sits on the right edge of a banner (44 x 44, labelled).
function BannerCalendarButton({ onPress, label }: { onPress: () => void; label: string }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: theme.primary + '1F', borderless: false }}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        opacity: pressed ? 0.85 : 1,
      })}>
      <Icon name="calendar" size={20} color={theme.text} />
    </Pressable>
  );
}

// The return deadline: calm while there is time, amber in the last 3 days, plain grey once it has passed.
export function ReturnBanner({ date, onCalendar }: { date: string; onCalendar?: () => void }) {
  const s = (useColorScheme() === 'dark' ? BannerStyleDark : BannerStyle)[
    daysLeft(date)! < 0 ? 'unknown' : daysLeft(date)! <= 3 ? 'expiring' : 'active'
  ];
  const left = daysLeft(date)!;
  const title = left < 0 ? t('banner.returnPassed') : left === 0 ? t('banner.returnToday') : t('banner.return');
  const detail =
    formatDate(date) + (left > 0 ? tn('suffixLeft', left) : left < 0 ? tn('suffixEnded', -left) : '');
  return (
    <View
      style={{
        backgroundColor: s.bg,
        borderColor: s.border,
        borderWidth: 1,
        borderRadius: Radius.md,
        padding: Spacing.three,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        ...SoftShadow,
      }}>
      <View style={{ flex: 1, gap: Spacing.one }}>
        <ThemedText style={{ color: s.fg, fontWeight: 700 }}>{title}</ThemedText>
        <ThemedText type="small" style={{ color: s.fg }}>
          {detail}
        </ThemedText>
      </View>
      {onCalendar && (
        <BannerCalendarButton onPress={onCalendar} label={t('detail.calReturn')} />
      )}
    </View>
  );
}

export function WarrantyBanner({ status, endDate, onCalendar }: { status: WarrantyStatus; endDate?: string | null; onCalendar?: () => void }) {
  const s = (useColorScheme() === 'dark' ? BannerStyleDark : BannerStyle)[status];
  const left = daysLeft(endDate);
  const detail = endDate
    ? t('banner.endDate', { date: formatDate(endDate) }) +
      (left === null ? '' : left >= 0 ? tn('suffixLeft', left) : tn('suffixEnded', -left))
    : t('banner.addDuration');
  return (
    <View
      style={{
        backgroundColor: s.bg,
        borderColor: s.border,
        borderWidth: 1,
        borderRadius: Radius.md,
        padding: Spacing.three,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        ...SoftShadow,
      }}>
      <View style={{ flex: 1, gap: Spacing.one }}>
        <ThemedText style={{ color: s.fg, fontWeight: 700 }}>{t(('banner.' + status) as Key)}</ThemedText>
        <ThemedText type="small" style={{ color: s.fg }}>
          {detail}
        </ThemedText>
      </View>
      {onCalendar && (
        <BannerCalendarButton onPress={onCalendar} label={t('detail.calWarranty')} />
      )}
    </View>
  );
}
