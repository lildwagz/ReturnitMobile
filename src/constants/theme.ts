/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * ReturnIt design system (Docs/mobile/04-design/theme-tokens.md).
 * Fill colors are the brand values; the *Text variants are darker so small text and white-on-color
 * labels stay readable (WCAG AA) on light backgrounds.
 */
export const Brand = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#DBEAFE',
  navy: '#17324D',
  secondary: '#64748B',
  line: '#E2E8F0',
  success: '#2CC35E',
  successText: '#15803D',
  warning: '#F59E0B',
  warningText: '#B45309',
  error: '#EF4444',
  errorText: '#B91C1C',
} as const;

/** Tinted pill used for warranty status: soft background, dark text (same as the prototype). */
export const StatusStyle = {
  active: { bg: '#DCFCE7', fg: '#166534' },
  expiring: { bg: '#FEF3C7', fg: '#92400E' },
  expired: { bg: '#FEE2E2', fg: '#991B1B' },
  unknown: { bg: '#F1F5F9', fg: '#475569' },
} as const;

export const StatusStyleDark = {
  active: { bg: '#14532D', fg: '#BBF7D0' },
  expiring: { bg: '#78350F', fg: '#FDE68A' },
  expired: { bg: '#7F1D1D', fg: '#FECACA' },
  unknown: { bg: '#1E293B', fg: '#CBD5E1' },
} as const;

/** Warranty banner on the detail screen: tinted background, border and text (prototype `.warranty-banner`). */
export const BannerStyle = {
  active: { bg: '#F0FDF4', border: '#BBF7D0', fg: '#166534' },
  expiring: { bg: '#FFFBEB', border: '#FDE68A', fg: '#92400E' },
  expired: { bg: '#FFF1F2', border: '#FECDD3', fg: '#9F1239' },
  unknown: { bg: '#F8FAFC', border: '#E2E8F0', fg: '#475569' },
} as const;

export const BannerStyleDark = {
  active: { bg: '#0F2A1B', border: '#14532D', fg: '#BBF7D0' },
  expiring: { bg: '#2B1E08', border: '#78350F', fg: '#FDE68A' },
  expired: { bg: '#2E1015', border: '#7F1D1D', fg: '#FECACA' },
  unknown: { bg: '#131E33', border: '#263552', fg: '#CBD5E1' },
} as const;

/**
 * Per-theme colors. The design only specifies the light palette; the dark one keeps the same hues on a
 * navy base, with lighter text colors (primary, error, success, warning) so they stay readable on dark.
 */
export const Colors = {
  light: {
    text: Brand.navy,
    background: '#F8FAFC',
    backgroundElement: '#EFF4FA',
    backgroundSelected: Brand.line,
    textSecondary: Brand.secondary,
    border: Brand.line,
    primary: Brand.primary,
    errorText: Brand.errorText,
    successText: Brand.successText,
    warningText: Brand.warningText,
  },
  dark: {
    text: '#F1F5F9',
    background: '#0B1220',
    backgroundElement: '#131E33',
    backgroundSelected: '#1E2B45',
    textSecondary: '#94A3B8',
    border: '#263552',
    primary: '#60A5FA',
    errorText: '#F87171',
    successText: '#4ADE80',
    warningText: '#FBBF24',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
