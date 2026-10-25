import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { LanguageSheet } from '@/components/language-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { LANGUAGES, t, useLanguage } from '@/i18n';
import { setAppLockEnabled, useAppLock } from '@/lib/app-lock';
import { logout } from '@/lib/auth';
import { exportPurchasesCsv } from '@/lib/export';
import { showToast } from '@/lib/toast';
import { useAccount } from '@/lib/use-account';
import { useSignedIn } from '@/lib/use-signed-in';

// One line of the settings card: title, one line of help, and a control on the right.
function SettingRow({ title, help, right, onPress, last }: { title: string; help: string; right: React.ReactNode; onPress?: () => void; last?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontWeight: 700 }}>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {help}
        </ThemedText>
      </View>
      {right}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const signedIn = useSignedIn();
  const { account } = useAccount(signedIn);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const lock = useAppLock();
  const { choice } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const languageName = choice === 'system' ? t('lang.system') : LANGUAGES.find((l) => l.value === choice)!.label;
  const [lockBusy, setLockBusy] = useState(false);

  async function toggleLock(on: boolean) {
    setLockBusy(true);
    const problem = await setAppLockEnabled(on);
    setLockBusy(false);
    if (problem) showToast(problem);
  }

  async function exportData() {
    setExporting(true);
    const problem = await exportPurchasesCsv();
    setExporting(false);
    if (problem) showToast(problem);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 120 }}>
          <View style={{ gap: 4 }}>
            <ThemedText type="title">{t('set.title')}</ThemedText>
            <ThemedText themeColor="textSecondary">{t('set.subtitle')}</ThemedText>
          </View>
          {!signedIn ? (
            <ThemedText>{t('set.signedOut')}</ThemedText>
          ) : (
            <>
              <ThemedView type="backgroundElement" style={{ borderRadius: 16, paddingHorizontal: 14 }}>
                <SettingRow
                  title={t('set.account')}
                  help={
                    account?.deletionScheduledFor
                      ? t('set.accountDeletion')
                      : (account?.email ?? t('set.accountHelp'))
                  }
                  right={<ThemedText themeColor="textSecondary" style={{ fontSize: 24 }}>{t('set.chevron')}</ThemedText>}
                  onPress={() => router.push('/account' as never)}
                />
                <SettingRow
                  title={t('set.reminders')}
                  help={t('set.remindersHelp')}
                  right={<AppButton variant="secondary" title={t('set.manage')} onPress={() => router.push('/reminder-settings' as never)} />}
                />
                <SettingRow
                  title={t('set.language')}
                  help={languageName}
                  right={<AppButton small variant="secondary" title={t('set.manage')} onPress={() => setLangOpen(true)} />}
                  onPress={() => setLangOpen(true)}
                />
                <SettingRow
                  title={t('set.appLock')}
                  help={t('set.appLockHelp')}
                  right={<Switch value={lock.enabled} onValueChange={toggleLock} disabled={lockBusy} accessibilityLabel={t('set.appLock')} />}
                />
                <SettingRow
                  title={t('set.export')}
                  help={t('set.exportHelp')}
                  right={<AppButton small variant="secondary" title={exporting ? t('set.exporting') : t('set.exportCsv')} onPress={exportData} disabled={exporting} />}
                />
                <SettingRow
                  title={t('set.privacy')}
                  help={t('set.privacyHelp')}
                  right={<ThemedText>{showPrivacy ? '▲' : '🔒'}</ThemedText>}
                  onPress={() => setShowPrivacy((v) => !v)}
                  last
                />
              </ThemedView>
              {showPrivacy && (
                <ThemedView type="backgroundElement" style={{ padding: 14, borderRadius: 14, gap: 8 }}>
                  <ThemedText type="small">
                    {t('set.privacy1')}
                  </ThemedText>
                  <ThemedText type="small">
                    {t('set.privacy2')}
                  </ThemedText>
                  <ThemedText type="small">
                    {t('set.privacy3')}
                  </ThemedText>
                  <ThemedText type="small">
                    {t('set.privacy4')}
                  </ThemedText>
                  <ThemedText type="small">
                    {t('set.privacy5')}
                  </ThemedText>
                </ThemedView>
              )}
              <AppButton variant="secondary" title={t('set.signOut')} onPress={logout} />
            </>
          )}
        </ScrollView>
        <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />
      </SafeAreaView>
    </ThemedView>
  );
}
