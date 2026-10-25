import { Alert, Modal, Pressable, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LANGUAGES, setLanguageChoice, t, useLanguage, type LanguageChoice } from '@/i18n';

// The language picker: follow the phone, or one of the three languages (each named in its own language).
export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { choice } = useLanguage();

  async function pick(value: LanguageChoice) {
    onClose();
    const restart = await setLanguageChoice(value);
    // Switching between left-to-right and right-to-left is applied by the system when the app starts.
    if (restart) Alert.alert(t('lang.restartTitle'), t('lang.restartBody'), [{ text: t('lang.ok') }]);
  }

  const options: { value: LanguageChoice; label: string }[] = [
    { value: 'system', label: t('lang.system') },
    ...LANGUAGES,
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel={t('common.close')} onPress={onClose} style={{ flex: 1, backgroundColor: '#00000066' }} />
      <ThemedView style={{ padding: 16, gap: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
        <ThemedText type="subtitle" style={{ fontSize: 18, lineHeight: 24 }}>
          {t('lang.title')}
        </ThemedText>
        <View style={{ gap: 8 }}>
          {options.map((o) => (
            <AppButton
              key={o.value}
              variant={choice === o.value ? 'primary' : 'secondary'}
              title={(choice === o.value ? '✓ ' : '') + o.label}
              onPress={() => pick(o.value)}
            />
          ))}
          <AppButton variant="secondary" title={t('common.cancel')} onPress={onClose} />
        </View>
      </ThemedView>
    </Modal>
  );
}
