import { useRouter } from 'expo-router';
import { useState } from 'react';
import { I18nManager, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { LanguageSheet } from '@/components/language-sheet';
import { Tile } from '@/components/tile';
import { prefsStatus, type Prefs } from '@/components/reminder-prefs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/app-button';
import { useTheme } from '@/hooks/use-theme';
import { LANGUAGES, t, useLanguage } from '@/i18n';
import { setAppLockEnabled, useAppLock } from '@/lib/app-lock';
import { logout } from '@/lib/auth';
import { exportPurchasesCsv } from '@/lib/export';
import { useReminderPrefs } from '@/lib/queries';
import { showToast } from '@/lib/toast';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAccount } from '@/lib/use-account';
import { useSignedIn } from '@/lib/use-signed-in';

// One line of a settings Tile: title, one line of help, and a chevron or switch on the
// other edge (the whole row is pressable always). Pressed feedback: opacity + ripple.
function SettingRow({
  title,
  help,
  chevron,
  switchValue,
  onSwitch,
  onSwitchDisabled,
  onSwitchLabel,
  onPress,
  last,
}: {
  title: string;
  help: string;
  chevron?: boolean;
  switchValue?: boolean;
  onSwitch?: (v: boolean) => void;
  onSwitchDisabled?: boolean;
  onSwitchLabel?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const theme = useTheme();
  const hasSwitch = onSwitch !== undefined;
  return (
    <Pressable
      disabled={!hasSwitch && !onPress}
      onPress={hasSwitch ? () => onSwitch?.(!switchValue) : onPress}
      accessibilityRole={hasSwitch ? undefined : onPress ? 'button' : undefined}
      accessibilityState={hasSwitch ? { checked: !!switchValue } : undefined}
      hitSlop={hasSwitch ? { top: 8, bottom: 8, left: 8, right: 8 } : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.two,
        minHeight: 44,
        opacity: pressed ? 0.85 : 1,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.border,
      })}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontWeight: '700' }}>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {help}
        </ThemedText>
      </View>
      {hasSwitch ? (
        <Switch
          value={!!switchValue}
          onValueChange={onSwitch}
          disabled={onSwitchDisabled}
          accessibilityLabel={onSwitchLabel}
        />
      ) : (
        chevron && <Icon name="chevron-right" size={20} color={theme.textSecondary} flip={I18nManager.isRTL} decorative />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const signedIn = useSignedIn();
  const { account } = useAccount(signedIn);
  const reminderPrefs = useReminderPrefs<Prefs>(signedIn === true).data;
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
        {/* Wide screens: same readable width as the lists. */}
        <View style={{ maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: 120 }}>
            <View style={{ gap: Spacing.one }}>
              <ThemedText type="title">{t('set.title')}</ThemedText>
              <ThemedText themeColor="textSecondary">{t('set.subtitle')}</ThemedText>
            </View>
            {!signedIn ? (
              <ThemedText>{t('set.signedOut')}</ThemedText>
            ) : (
              <>
                {/* Account */}
                <Tile padding={Spacing.three} gap={0}>
                  <SettingRow
                    title={t('set.account')}
                    help={
                      account?.deletionScheduledFor
                        ? t('set.accountDeletion')
                        : (account?.email ?? t('set.accountHelp'))
                    }
                    chevron
                    onPress={() => router.push('/account' as never)}
                    last
                  />
                </Tile>

                {/* Preferences */}
                <Tile padding={Spacing.three} gap={0}>
                  <SettingRow
                    title={t('set.reminders')}
                    help={reminderPrefs ? prefsStatus(reminderPrefs) : t('set.remindersHelp')}
                    chevron
                    onPress={() => router.push('/reminder-settings' as never)}
                  />
                  <SettingRow
                    title={t('set.language')}
                    help={languageName}
                    chevron
                    onPress={() => setLangOpen(true)}
                  />
                  <SettingRow
                    title={t('set.appLock')}
                    help={t('set.appLockHelp')}
                    switchValue={lock.enabled}
                    onSwitch={toggleLock}
                    onSwitchDisabled={lockBusy}
                    onSwitchLabel={t('set.appLock')}
                    last
                  />
                </Tile>

                {/* Data and privacy */}
                <Tile padding={Spacing.three} gap={0}>
                  <SettingRow
                    title={t('set.export')}
                    help={exporting ? t('set.exporting') : t('set.exportHelp')}
                    chevron
                    onPress={exporting ? undefined : exportData}
                  />
                  <SettingRow
                    title={t('set.privacy')}
                    help={t('set.privacyHelp')}
                    chevron
                    onPress={() => setShowPrivacy((v) => !v)}
                    last
                  />
                </Tile>

                {showPrivacy && (
                  <ThemedView type="backgroundElement" style={{ padding: Spacing.three, borderRadius: Radius.md, gap: Spacing.two }}>
                    <ThemedText type="small">{t('set.privacy1')}</ThemedText>
                    <ThemedText type="small">{t('set.privacy2')}</ThemedText>
                    <ThemedText type="small">{t('set.privacy3')}</ThemedText>
                    <ThemedText type="small">{t('set.privacy4')}</ThemedText>
                    <ThemedText type="small">{t('set.privacy5')}</ThemedText>
                  </ThemedView>
                )}

                {/* Sign out: apart from the sections, clearly its own action. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('set.signOut')}
                  onPress={logout}
                  android_ripple={{ color: '#F871711F' }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.two,
                    minHeight: 44,
                    paddingVertical: Spacing.two,
                    opacity: pressed ? 0.85 : 1,
                  })}>
                  <Icon name="log-out" size={20} color={theme.errorText} decorative />
                  <ThemedText style={{ color: theme.errorText, fontWeight: '700' }}>{t('set.signOut')}</ThemedText>
                </Pressable>
              </>
            )}
          </ScrollView>
          <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
