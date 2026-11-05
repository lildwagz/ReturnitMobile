import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { usePendingInvite } from '@/lib/buckets';

// An invite link was opened while the person was not signed in (or the app was closed): it waits here until they decide.
export function PendingInviteBanner() {
  const router = useRouter();
  const theme = useTheme();
  const pending = usePendingInvite();
  if (!pending) return null;
  return (
    <View
      accessibilityRole="summary"
      style={{ padding: Spacing.three, borderRadius: Radius.md, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border, gap: Spacing.two }}>
      <ThemedText style={{ fontWeight: '700' }}>{t('bk.invitedBanner')}</ThemedText>
      <AppButton small title={t('bk.invitedOpen')} onPress={() => router.push('/join' as never)} />
    </View>
  );
}
