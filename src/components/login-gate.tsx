import { Image } from 'expo-image';
import { useState } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSheet } from '@/components/language-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { t } from '@/i18n';
import { login } from '@/lib/auth';
import { AppButton } from '@/components/app-button';

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
        <ThemedText>{t('login.intro')}</ThemedText>
        <AppButton title={t('login.signIn')} onPress={async () => setError(await login())} />
        <AppButton
          variant="secondary"
          title={t('login.google')}
          onPress={async () => setError(await login(false, false, 'google'))}
        />
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
