import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, SoftShadow, Spacing } from '@/constants/theme';

/**
 * One bento tile: a card on `backgroundElement` with the soft shadow, a 1 px border and the
 * tile radius. Tappable tiles fade slightly on press (no layout shift) and ripple on Android.
 */
export function Tile({
  padding = Spacing.three,
  gap = Spacing.two,
  radius = Radius.md,
  onPress,
  accessibilityLabel,
  style,
  children,
}: {
  padding?: number;
  gap?: number;
  radius?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const card: ViewStyle = {
    borderRadius: radius,
    padding,
    gap,
    backgroundColor: theme.backgroundElement,
    borderWidth: 1,
    borderColor: theme.border,
    ...SoftShadow,
  };
  if (!onPress) return <View style={[card, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      android_ripple={{ color: theme.primary + '1F' }}
      style={({ pressed }) => [card, style, { opacity: pressed ? 0.9 : 1 }]}>
      {children}
    </Pressable>
  );
}

/** Small label above/below a tile number. */
export function TileLabel({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
      {children}
    </ThemedText>
  );
}
