import { Linking, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoftShadow, Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { dismissUpdateInvite, isInviteDismissed, useAppGate } from '@/lib/app-gate';

// A version newer than this one exists. It can be closed (once per version, until the app is closed); the lock
// screen (UpdateGate) is used only when the server says the update is required.
export function UpdateBanner() {
  const gate = useAppGate();
  if (gate.status !== 'update_available' || isInviteDismissed(gate.latestVersion)) return null;
  return (
    <ThemedView type="backgroundElement" style={{ borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.two, ...SoftShadow }}>
      <ThemedText style={{ fontWeight: 700 }}>
        {t('update.available', { version: gate.latestVersion ?? t('update.newest') })}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {gate.message || t('update.defaultMessage')}
      </ThemedText>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {gate.downloadUrl && (
          <View style={{ flex: 1 }}>
            <AppButton small title={t('update.update')} onPress={() => Linking.openURL(gate.downloadUrl!).catch(() => {})} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <AppButton small variant="secondary" title={t('update.later')} onPress={() => dismissUpdateInvite(gate.latestVersion)} />
        </View>
      </View>
    </ThemedView>
  );
}
