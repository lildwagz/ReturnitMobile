import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function OAuthRedirect() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }, 3000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ThemedText>Finishing login...</ThemedText>
    </ThemedView>
  );
}