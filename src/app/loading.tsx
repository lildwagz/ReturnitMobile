import { ActivityIndicator } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

// Shown while the app checks whether a saved login is still valid (it may refresh the token over the network).
export default function Loading() {
  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Brand.primary} />
    </ThemedView>
  );
}
