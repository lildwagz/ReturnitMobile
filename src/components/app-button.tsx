import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'danger';

// Same props as React Native's Button, plus a variant, so screens can swap it in one for one.
export function AppButton({
  title,
  onPress,
  disabled,
  variant = 'primary',
  small,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: Variant;
  small?: boolean;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const look = {
    primary: { bg: Brand.primary, fg: '#FFFFFF', border: Brand.primary },
    secondary: { bg: theme.backgroundElement, fg: theme.text, border: theme.border },
    danger: dark
      ? { bg: '#3B1219', fg: '#FCA5A5', border: '#7F1D1D' }
      : { bg: '#FFF1F2', fg: '#BE123C', border: '#FECDD3' },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: look.bg,
        borderColor: look.border,
        borderWidth: 1,
        borderRadius: 12,
        minHeight: 44, // minimum touch target
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}>
      <ThemedText maxFontSizeMultiplier={1.2} style={{ color: look.fg, fontWeight: 700, fontSize: small ? 13 : 16, lineHeight: small ? 18 : 24 }}>{title}</ThemedText>
    </Pressable>
  );
}
