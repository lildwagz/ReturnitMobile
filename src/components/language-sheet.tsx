import { Alert, Pressable, ScrollView } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { LANGUAGES, setLanguageChoice, t, useLanguage, type LanguageChoice } from '@/i18n';

// Small "Cancel" text row at the bottom of the sheet, with the link-blue tone.
function CancelTextRow({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.cancel')}
      onPress={onClose}
      hitSlop={{ top: 8, bottom: 8, right: 8, left: 8 }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        minHeight: 44,
        justifyContent: 'center',
        borderRadius: Radius.sm,
        opacity: pressed ? 0.7 : 1,
      })}>
      <ThemedText type="linkPrimary">{t('common.cancel')}</ThemedText>
    </Pressable>
  );
}

// The language picker: follow the phone, or one of the three languages (each named in its own
// language). Each option is one row with a check mark on the selected one (no glyph in a title).
export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { choice } = useLanguage();
  const theme = useTheme();

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
    <BottomSheet visible={visible} onClose={onClose} title={t('lang.title')}>
      <ScrollView style={{ maxHeight: 400 }}>
        {options.map((o) => {
          const selected = choice === o.value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityLabel={o.label}
              accessibilityState={{ selected }}
              onPress={() => pick(o.value)}
              android_ripple={{ color: theme.primary + '1F' }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.two,
                minHeight: 48,
                padding: Spacing.three,
                borderRadius: Radius.sm,
                backgroundColor: theme.backgroundElement,
                opacity: pressed ? 0.85 : 1,
              })}>
              <ThemedText style={{ fontWeight: selected ? '700' : '400', flex: 1 }}>{o.label}</ThemedText>
              {selected && <Icon name="check" size={20} color={theme.primary} decorative />}
            </Pressable>
          );
        })}
      </ScrollView>
      <CancelTextRow onClose={onClose} />
    </BottomSheet>
  );
}
