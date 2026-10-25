import { Modal, Pressable, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export type SnoozeChoice = 'tomorrow' | 'in_3_days' | 'next_week';

const CHOICES: { value: SnoozeChoice; label: string }[] = [
  { value: 'tomorrow', label: 'Besok pukul 09.00' },
  { value: 'in_3_days', label: '3 hari lagi' },
  { value: 'next_week', label: 'Minggu depan' },
];

// "Remind me again": a sheet from the bottom with the three delays the server accepts.
export function SnoozeSheet({
  visible,
  busy,
  onPick,
  onClose,
}: {
  visible: boolean;
  busy: boolean;
  onPick: (choice: SnoozeChoice) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Tutup" onPress={onClose} style={{ flex: 1, backgroundColor: '#00000066' }} />
      <ThemedView style={{ padding: 16, gap: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
        <ThemedText type="subtitle" style={{ fontSize: 18, lineHeight: 24 }}>
          Ingatkan lagi
        </ThemedText>
        <View style={{ gap: 8 }}>
          {CHOICES.map((c) => (
            <AppButton key={c.value} variant="secondary" title={c.label} onPress={() => onPick(c.value)} disabled={busy} />
          ))}
          <AppButton variant="secondary" title="Batal" onPress={onClose} disabled={busy} />
        </View>
      </ThemedView>
    </Modal>
  );
}
