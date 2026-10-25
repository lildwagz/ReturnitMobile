import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Brand, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

// Custom fonts have one file per weight, so the weight in the style picks the family
// (the families are loaded in src/app/_layout.tsx). Until they load the system font is used.
function family(weight: unknown): string {
  const w = Number(weight ?? 400);
  if (w >= 600) return 'PlusJakartaSans_700Bold';
  if (w >= 500) return 'PlusJakartaSans_500Medium';
  return 'PlusJakartaSans_400Regular';
}

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const merged: TextStyle = StyleSheet.flatten([{ color: theme[themeColor ?? 'text'] }, styles[type], style]) ?? {};
  const font = type === 'code' || merged.fontFamily ? undefined : { fontFamily: family(merged.fontWeight), fontWeight: undefined };

  return <Text style={[merged, font]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: 700,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: Brand.primary,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
