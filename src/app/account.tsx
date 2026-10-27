import { ActivityIndicator, ScrollView, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { logout } from '@/lib/auth';
import { useAccount } from '@/lib/use-account';
import { useSignedIn } from '@/lib/use-signed-in';
import { formatDate } from '@/lib/warranty';

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ paddingVertical: Spacing.three, gap: 2, borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.border }}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText>{value}</ThemedText>
    </View>
  );
}

export default function AccountScreen() {
  const signedIn = useSignedIn();
  const { account, loadError, busy, message, loadAccount, confirmDeletion, cancelDeletion } = useAccount(signedIn);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: 80 }}>
        {loadError && (
          <View style={{ gap: Spacing.two }}>
            <ThemedText themeColor="errorText">{loadError}</ThemedText>
            <AppButton variant="secondary" title={t('acc.retry')} onPress={loadAccount} />
          </View>
        )}
        {!account && !loadError && <ActivityIndicator />}

        {account && (
          <ThemedView type="backgroundElement" style={{ borderRadius: Radius.md, paddingHorizontal: Spacing.three }}>
            <Row label={t('acc.name')} value={account.displayName || '-'} />
            <Row label={t('acc.email')} value={account.email} />
            <Row label={t('acc.since')} value={formatDate(account.createdAt.slice(0, 10))} last />
          </ThemedView>
        )}
        {account && (
          <ThemedText type="small" themeColor="textSecondary">
            {t('acc.note')}
          </ThemedText>
        )}

        {account?.deletionScheduledFor ? (
          <ThemedView type="backgroundElement" style={{ padding: Spacing.three, borderRadius: Radius.md, gap: Spacing.two }}>
            <ThemedText style={{ fontWeight: 700 }}>{t('acc.deletionScheduled')}</ThemedText>
            <ThemedText>
              {t('acc.deletionBody', { when: new Date(account.deletionScheduledFor).toLocaleString() })}
            </ThemedText>
            {busy ? <ActivityIndicator /> : <AppButton variant="secondary" title={t('acc.cancelDeletion')} onPress={cancelDeletion} />}
          </ThemedView>
        ) : (
          account && (busy ? <ActivityIndicator /> : <AppButton title={t('acc.delete')} variant="danger" onPress={confirmDeletion} />)
        )}

        {message && <ThemedText>{message}</ThemedText>}

        <AppButton variant="secondary" title={t('set.signOut')} onPress={logout} />
      </ScrollView>
    </ThemedView>
  );
}
