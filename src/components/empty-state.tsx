import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

// Title plus one line of help, as in the prototype's `.empty` block.
export function EmptyState({ title, help }: { title: string; help: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16, gap: 4 }}>
      <ThemedText style={{ fontWeight: 700 }}>{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        {help}
      </ThemedText>
    </View>
  );
}
