import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppTextInput } from '@/components/app-text-input';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { InvitePreview, joinInvite, previewInvite, selectBucket, setPendingInvite, tokenFromText, usePendingInvite } from '@/lib/buckets';
import { showToast } from '@/lib/toast';

type Checked = { token: string; preview?: InvitePreview; error?: string };

// Joining a bucket: the invite comes from an opened link (kept in `pending`) or from a pasted code. The person first sees
// which bucket it is and who invited them, and only then agrees.
export default function JoinScreen() {
  const router = useRouter();
  const theme = useTheme();
  const pending = usePendingInvite();
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(token: string) {
    const r = await previewInvite(token);
    setChecked(r.ok ? { token, preview: r.data } : { token, error: r.error });
  }

  // A link opened by the person (or before signing in) is checked as soon as this screen is up.
  useEffect(() => {
    if (!pending) return;
    let live = true;
    previewInvite(pending).then((r) => {
      if (live) setChecked(r.ok ? { token: pending, preview: r.data } : { token: pending, error: r.error });
    });
    return () => {
      live = false;
    };
  }, [pending]);

  const waiting = !!pending && checked?.token !== pending; // the opened link is still being checked
  const preview = checked?.preview ?? null;
  const error = joinError ?? checked?.error ?? typedError;

  async function submitTyped() {
    setTypedError(null);
    setJoinError(null);
    const code = tokenFromText(typed);
    if (!code) {
      setTypedError(t('bk.join.badCode'));
      return;
    }
    setBusy(true);
    await check(code);
    setBusy(false);
  }

  async function join() {
    if (!checked || busy) return;
    setBusy(true);
    setJoinError(null);
    const r = await joinInvite(checked.token);
    setBusy(false);
    if (!r.ok) {
      setJoinError(r.error);
      return;
    }
    setPendingInvite(null);
    selectBucket(r.data.id);
    showToast(t('bk.join.done', { name: r.data.name }));
    router.replace('/' as never);
  }

  function notNow() {
    setPendingInvite(null);
    if (router.canGoBack()) router.back();
    else router.replace('/' as never);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: t('bk.join.enterTitle') }} />
      <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
        {waiting && (
          <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <ActivityIndicator />
            <ThemedText themeColor="textSecondary">{t('bk.join.checking')}</ThemedText>
          </View>
        )}

        {preview ? (
          <>
            <View style={{ alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="home" size={24} color={theme.primary} decorative />
              </View>
              <ThemedText accessibilityRole="header" type="subtitle" style={{ textAlign: 'center' }}>
                {t('bk.join.title', { name: preview.bucketName })}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
                {preview.invitedBy
                  ? t('bk.join.by', { name: preview.invitedBy, n: preview.memberCount })
                  : t('bk.join.byUnknown', { n: preview.memberCount })}
              </ThemedText>
            </View>
            <View style={{ padding: Spacing.three, borderRadius: Radius.md, backgroundColor: theme.backgroundElement }}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('bk.join.warn')}
              </ThemedText>
            </View>
            {preview.full && <ThemedText themeColor="errorText">{t('bk.join.full')}</ThemedText>}
            {error && (
              <ThemedText accessibilityLiveRegion="polite" themeColor="errorText">
                {error}
              </ThemedText>
            )}
            {busy ? <ActivityIndicator /> : <AppButton title={t('bk.join.action')} onPress={join} disabled={preview.full} />}
            <AppButton variant="secondary" title={t('bk.join.later')} onPress={notNow} disabled={busy} />
          </>
        ) : (
          !waiting && (
            <>
              <ThemedText type="small">{t('bk.join.enterLabel')}</ThemedText>
              <AppTextInput
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={submitTyped}
              />
              {error && (
                <ThemedText accessibilityLiveRegion="polite" themeColor="errorText">
                  {error}
                </ThemedText>
              )}
              {busy ? <ActivityIndicator /> : <AppButton title={t('bk.join.check')} onPress={submitTyped} disabled={typed.trim().length === 0} />}
            </>
          )
        )}
      </ScrollView>
    </ThemedView>
  );
}
