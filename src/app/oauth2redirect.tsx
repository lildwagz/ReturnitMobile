import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { t } from '@/i18n';

export default function OAuthRedirect() {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ThemedText>{t('oauth.finishing')}</ThemedText>
    </ThemedView>
  );
}