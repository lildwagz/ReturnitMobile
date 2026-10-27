import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, View } from 'react-native';

import { AppTextInput } from '@/components/app-text-input';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { isValidDate } from '@/lib/purchase';
import { formatDate, todayLocal } from '@/lib/warranty';

const pad = (n: number) => String(n).padStart(2, '0');
const toString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function toDate(s: string): Date {
  const [y, m, d] = (isValidDate(s) ? s : todayLocal()).split('-').map(Number);
  return new Date(y, m - 1, d);
}

// A plain date as 'YYYY-MM-DD' in and out (never a timestamp), picked with the system date picker.
export function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const theme = useTheme();

  if (Platform.OS === 'ios') {
    return (
      <View style={{ alignItems: 'flex-start' }}>
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display="compact"
          onChange={(_, d) => d && onChange(toString(d))}
        />
      </View>
    );
  }
  if (Platform.OS === 'android') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          DateTimePickerAndroid.open({
            value: toDate(value),
            mode: 'date',
            onChange: (e, d) => {
              if (e.type === 'set' && d) onChange(toString(d));
            },
          })
        }
        style={{
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: Radius.sm,
          padding: Spacing.three,
        }}>
        <ThemedText>{formatDate(isValidDate(value) ? value : todayLocal())}</ThemedText>
      </Pressable>
    );
  }
  return <AppTextInput value={value} onChangeText={onChange} placeholder="2026-10-19" autoCapitalize="none" />;
}
