import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { t } from '@/i18n';

/**
 * The one bottom-sheet shell: dimmed backdrop that closes, dialog role, drag handle,
 * Radius.xl top and bottom safe-area padding. The sheets pass their rows as children,
 * so behaviour and content stay theirs.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  label,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  /** Headline shown under the handle; leave out for sheets that render their own title. */
  title?: string;
  /** Screen-reader name of the dialog; defaults to the title. */
  label?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0B1220AA' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={{ flex: 1 }} />
        <View
          accessibilityRole="dialog"
          accessibilityLabel={label ?? title}
          style={{
            backgroundColor: theme.background,
            borderTopLeftRadius: Radius.xl,
            borderTopRightRadius: Radius.xl,
            padding: Spacing.four,
            paddingTop: Spacing.two,
            paddingBottom: insets.bottom + Spacing.two,
            gap: Spacing.two,
          }}>
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.border,
              marginBottom: Spacing.two,
            }}
          />
          {title ? <ThemedText type="subtitle">{title}</ThemedText> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}
