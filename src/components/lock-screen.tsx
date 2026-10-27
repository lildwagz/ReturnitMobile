import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { unlockApp, useAppLock } from '@/lib/app-lock';
import { logout } from '@/lib/auth';

// Covers the whole app while it is locked. The screens underneath stay mounted (so the person returns to where they
// were) but are hidden from touch and from screen readers by the root layout.
export function LockScreen() {
  const { ready } = useAppLock();
  const dark = useColorScheme() === 'dark';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await unlockApp();
    setBusy(false);
    if (r.ok) return;
    if (r.error === 'not_enrolled' || r.error === 'passcode_not_set' || r.error === 'not_available') {
      setError(t('lock.notEnrolled'));
    } else if (r.error === 'lockout') {
      setError(t('lock.lockout'));
    } else if (r.error !== 'user_cancel' && r.error !== 'system_cancel' && r.error !== 'app_cancel') {
      setError(t('lock.failed'));
    }
  }

  // Ask straight away when the lock appears; the button is for trying again.
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(unlock, 0); // after the screen is drawn, not during the effect itself
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <ThemedView style={[StyleSheet.absoluteFill, { zIndex: 900 }]}>
      {ready && (
        <SafeAreaView style={{ flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three }}>
          <Image
            source={dark ? require('@/assets/images/logo-lockup-dark.png') : require('@/assets/images/logo-lockup.png')}
            style={{ width: 200, height: 54, alignSelf: 'center' }}
            contentFit="contain"
            accessibilityLabel="ReturnIt"
          />
          <ThemedText type="title" style={{ textAlign: 'center' }}>
            {t('lock.title')}
          </ThemedText>
          <ThemedText style={{ textAlign: 'center' }}>
            {t('lock.hint')}
          </ThemedText>
          <View style={{ gap: Spacing.two }}>
            <AppButton title={busy ? t('lock.checking') : t('lock.unlock')} onPress={unlock} disabled={busy} />
            <AppButton variant="secondary" title={t('lock.signOut')} onPress={logout} disabled={busy} />
          </View>
          {error && (
            <ThemedText type="small" themeColor="errorText" style={{ textAlign: 'center' }}>
              {error}
            </ThemedText>
          )}
        </SafeAreaView>
      )}
    </ThemedView>
  );
}
