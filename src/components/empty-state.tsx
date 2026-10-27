import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Icon, type FeatherName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

/**
 * Empty state: optional icon in a soft disc, title, one line of help and an optional action
 * button. `icon` and the action are optional; the plain title + help form stays valid.
 */
export function EmptyState({ title, help, icon, actionTitle, onAction }: {
  title: string;
  help: string;
  icon?: FeatherName;
  actionTitle?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16, gap: Spacing.two }}>
      {icon && (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            backgroundColor: theme.backgroundElement,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: Spacing.two,
          }}>
          <Icon name={icon} size={24} color={theme.textSecondary} decorative />
        </View>
      )}
      <ThemedText style={{ fontWeight: '700' }}>{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        {help}
      </ThemedText>
      {onAction && actionTitle && (
        <View style={{ marginTop: Spacing.two, alignSelf: 'stretch' }}>
          <AppButton title={actionTitle} onPress={onAction} />
        </View>
      )}
    </View>
  );
}
