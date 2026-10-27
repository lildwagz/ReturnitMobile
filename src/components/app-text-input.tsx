import { TextInput, type TextInputProps } from 'react-native';
import type { ComponentRef, RefObject } from 'react';

import { family } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

// Text field with the app's font, border and colors. Props (including style) override the defaults.
// `inputRef` exposes the underlying TextInput so callers can focus it (first-error focus on the form).
export function AppTextInput({ style, inputRef, ...rest }: TextInputProps & { inputRef?: RefObject<ComponentRef<typeof TextInput> | null> }) {
  const theme = useTheme();
  return (
    <TextInput
      ref={inputRef}
      placeholderTextColor={theme.textSecondary}
      style={[
        {
          color: theme.text,
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          fontSize: 16,
          fontFamily: family(500),
        },
        style,
      ]}
      {...rest}
    />
  );
}
