import { Linking, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { dismissUpdateInvite, isInviteDismissed, useAppGate } from '@/lib/app-gate';

// A version newer than this one exists. It can be closed (once per version, until the app is closed); the lock
// screen (UpdateGate) is used only when the server says the update is required.
export function UpdateBanner() {
  const gate = useAppGate();
  if (gate.status !== 'update_available' || isInviteDismissed(gate.latestVersion)) return null;
  return (
    <ThemedView type="backgroundElement" style={{ borderRadius: 16, padding: 14, gap: 10 }}>
      <ThemedText style={{ fontWeight: 700 }}>
        {'Versi ' + (gate.latestVersion ?? 'terbaru') + ' tersedia'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {gate.message || 'Perbarui untuk mendapatkan perbaikan dan fitur terbaru.'}
      </ThemedText>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {gate.downloadUrl && (
          <View style={{ flex: 1 }}>
            <AppButton small title="Perbarui" onPress={() => Linking.openURL(gate.downloadUrl!).catch(() => {})} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <AppButton small variant="secondary" title="Nanti" onPress={() => dismissUpdateInvite(gate.latestVersion)} />
        </View>
      </View>
    </ThemedView>
  );
}
