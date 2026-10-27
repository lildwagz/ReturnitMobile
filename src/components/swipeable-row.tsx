import { I18nManager, Pressable, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { ReactNode, Ref } from 'react';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

// The two swipe actions (Edit, Delete), shared by both edges. Rendered from the END side in
// left-to-right and from the LEFT side in right-to-left, so the drag direction mirrors.
function Actions({ rtl, editLabel, deleteLabel, onEdit, onDelete, closeRow }: {
  rtl: boolean;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  closeRow: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'stretch' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={editLabel}
        onPress={() => {
          closeRow();
          onEdit();
        }}
        android_ripple={{ color: theme.primary + '1F' }}
        style={({ pressed }) => ({
          width: 76,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          backgroundColor: theme.backgroundSelected,
          opacity: pressed ? 0.85 : 1,
        })}>
        <Icon name="edit-3" size={20} color={theme.text} decorative />
        <ThemedText maxFontSizeMultiplier={1.2} type="small">
          {editLabel}
        </ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={deleteLabel}
        onPress={() => {
          closeRow();
          onDelete();
        }}
        android_ripple={{ color: '#FFFFFF33' }}
        style={({ pressed }) => ({
          width: 76,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          backgroundColor: theme.errorText,
          opacity: pressed ? 0.85 : 1,
        })}>
        <Icon name="trash-2" size={20} color="#FFFFFF" decorative />
        <ThemedText maxFontSizeMultiplier={1.2} type="small" style={{ color: '#FFFFFF' }}>
          {deleteLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

/**
 * Wraps a list row with swipe actions revealed from the END side: Edit and Delete.
 * RTL flips the side (actions render on the LEFT edge in right-to-left), matching the
 * mirrored drag direction. The wrapped row keeps every gesture; the swipe threshold keeps
 * vertical scrolling and the Android back gesture safe.
 */
export function SwipeableRow({
  children,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
  onWillOpen,
  ref,
}: {
  children: ReactNode;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  /** Fired just before this row opens, so the list can close the row that was open. */
  onWillOpen?: () => void;
  ref?: Ref<SwipeableMethods>;
}) {
  const rtl = I18nManager.isRTL;
  const actionProps = { rtl, editLabel, deleteLabel, onEdit, onDelete };
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      leftThreshold={40}
      overshootRight={false}
      overshootLeft={false}
      containerStyle={{ borderRadius: Radius.md, overflow: 'hidden' }}
      childrenContainerStyle={{ overflow: 'hidden' }}
      onSwipeableWillOpen={onWillOpen}
      renderRightActions={(_progress, _drag, methods) => (rtl ? null : <Actions {...actionProps} closeRow={() => methods.close()} />)}
      renderLeftActions={(_progress, _drag, methods) => (rtl ? <Actions {...actionProps} closeRow={() => methods.close()} /> : null)}>
      {children}
    </ReanimatedSwipeable>
  );
}
