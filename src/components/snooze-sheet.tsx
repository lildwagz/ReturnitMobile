import { Modal, Pressable, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { t, type Key } from '@/i18n';

export type SnoozeChoice = 'tomorrow' | 'in_3_days' | 'next_week';

const CHOICES: SnoozeChoice[] = ['tomorrow', 'in_3_days', 'next_week'];

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
      <Pressable accessibilityLabel={t('common.close')} onPress={onClose} style={{ flex: 1, backgroundColor: '#00000066' }} />
      <ThemedView style={{ padding: 16, gap: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
        <ThemedText type="subtitle" style={{ fontSize: 18, lineHeight: 24 }}>
          {t('snooze.title')}
        </ThemedText>
        <View style={{ gap: 8 }}>
          {CHOICES.map((c) => (
            <AppButton key={c} variant="secondary" title={t(('snooze.' + c) as Key)} onPress={() => onPick(c)} disabled={busy} />
          ))}
          <AppButton variant="secondary" title={t('common.cancel')} onPress={onClose} disabled={busy} />
        </View>
      </ThemedView>
    </Modal>
  );
}
