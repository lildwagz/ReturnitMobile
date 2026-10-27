import { Image } from 'expo-image';
import { useState } from 'react';
import { View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { LanguageSheet } from '@/components/language-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { login } from '@/lib/auth';
import { AppButton } from '@/components/app-button';

// One line under the logo: what the app is for, each with a small icon.
function Benefit({ icon, text }: { icon: 'calendar' | 'bell' | 'file-text'; text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 28 }}>
      <Icon name={icon} size={20} color={theme.textSecondary} decorative />
      <ThemedText>{text}</ThemedText>
    </View>
  );
}

export function LoginGate() {
  const dark = useColorScheme() === 'dark';
  const [error, setError] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center' }}>
        <Image
          source={dark ? require('@/assets/images/logo-lockup-dark.png') : require('@/assets/images/logo-lockup.png')}
          style={{ width: 240, height: 65 }}
          contentFit="contain"
          accessibilityLabel="ReturnIt"
        />
        <View style={{ gap: 8, marginTop: 8 }}>
          <Benefit icon="calendar" text={t('login.benefit1')} />
          <Benefit icon="bell" text={t('login.benefit2')} />
          <Benefit icon="file-text" text={t('login.benefit3')} />
        </View>
        <View style={{ gap: 8, marginTop: 8 }}>
          <AppButton title={t('login.signIn')} onPress={async () => setError(await login())} />
          <AppButton
            variant="secondary"
            title={t('login.google')}
            onPress={async () => setError(await login(false, false, 'google'))}
          />
        </View>
        <AppButton small variant="secondary" title={t('set.language')} onPress={() => setLangOpen(true)} />
        {error && (
          <ThemedText type="small" themeColor="errorText">
            {error}
          </ThemedText>
        )}
        <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />
      </SafeAreaView>
    </ThemedView>
  );
}
