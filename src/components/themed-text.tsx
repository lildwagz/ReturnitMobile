import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Brand, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { currentLanguage } from '@/i18n';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

// Custom fonts have one file per weight, so the weight in the style picks the family
// (the families are loaded in src/app/_layout.tsx). Until they load the system font is used.
// Arabic text uses Noto Sans Arabic, which has the Arabic letters the Latin font lacks.
export function family(weight: unknown): string {
  const w = Number(weight ?? 400);
  const base = currentLanguage() === 'ar' ? 'NotoSansArabic' : 'PlusJakartaSans';
  if (w >= 600) return base + '_700Bold';
  if (w >= 500) return base + '_500Medium';
  return base + '_400Regular';
}

export function ThemedText({ style, type = 'default', themeColor, maxFontSizeMultiplier = 1.6, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const merged: TextStyle = StyleSheet.flatten([{ color: theme[themeColor ?? 'text'] }, styles[type], style]) ?? {};
  const font = type === 'code' || merged.fontFamily ? undefined : { fontFamily: family(merged.fontWeight), fontWeight: undefined };

  // Body text scales with the system font up to 1.6x; callers pass a lower cap for the big
  // numerals, chips and button labels so the 44 pt layouts hold. Scaling is never disabled.
  return <Text maxFontSizeMultiplier={maxFontSizeMultiplier} style={[merged, font]} {...rest} />;
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
