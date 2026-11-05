import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { useNotifications } from '@/lib/queries';
import { useSignedIn } from '@/lib/use-signed-in';

// The way into the reminders inbox (it used to be a tab): a bell in the corner of Home, Pembelian and Tenggat, with the number
// of unread reminders. The list the server returns for "unread only" is capped at 50, so 50 shows as "50+".
export function BellButton() {
  const router = useRouter();
  const theme = useTheme();
  const signedIn = useSignedIn() === true;
  const unread = (useNotifications<unknown>(true, signedIn).data ?? []).length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? t('ov.bellA11y', { n: unread }) : t('ov.bell')}
      onPress={() => router.push('/reminders' as never)}
      android_ripple={{ color: theme.primary + '1F', radius: 24 }}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.backgroundElement,
        borderWidth: 1,
        borderColor: theme.border,
        opacity: pressed ? 0.85 : 1,
      })}>
      <Icon name="bell" size={20} color={theme.text} decorative />
      {unread > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            end: -4,
            minWidth: 20,
            height: 20,
            paddingHorizontal: 5,
            borderRadius: 10,
            backgroundColor: Brand.error,
            borderWidth: 2,
            borderColor: theme.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <ThemedText maxFontSizeMultiplier={1} style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 11, lineHeight: 14 }}>
            {unread >= 50 ? '50+' : String(unread)}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}
