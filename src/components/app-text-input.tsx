import { TextInput, type TextInputProps } from 'react-native';

import { family } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

// Text field with the app's font, border and colors. Props (including style) override the defaults.
export function AppTextInput({ style, ...rest }: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
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
