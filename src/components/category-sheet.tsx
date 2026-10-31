import { Pressable, ScrollView } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { CATEGORIES } from '@/lib/category';

// The category filter of the Pembelian list: "all categories" and the eleven categories, one tap each.
// A sheet rather than a chip row: the list already has a row of status chips, and eleven translated names
// do not fit a 375 px row, least of all in Arabic.
export function CategorySheet({ visible, value, onSelect, onClose }: { visible: boolean; value: string; onSelect: (key: string) => void; onClose: () => void }) {
  const theme = useTheme();
  const options: { key: string; label: string; icon: (typeof CATEGORIES)[number]['icon'] }[] = [
    { key: '', label: t('cat.filterAll'), icon: 'grid' },
    ...CATEGORIES.map((c) => ({ key: c.key as string, label: c.label(), icon: c.icon })),
  ];
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('cat.filter')}>
      <ScrollView style={{ maxHeight: 420 }}>
        {options.map((o) => {
          const selected = value === o.key;
          return (
            <Pressable
              key={o.key || 'all'}
              accessibilityRole="button"
              accessibilityLabel={o.label}
              accessibilityState={{ selected }}
              onPress={() => onSelect(o.key)}
              android_ripple={{ color: theme.primary + '1F' }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                minHeight: 48,
                paddingHorizontal: Spacing.two,
                opacity: pressed ? 0.85 : 1,
              })}>
              <Icon name={o.icon} size={20} color={selected ? theme.primary : theme.textSecondary} decorative />
              <ThemedText style={{ flex: 1, fontWeight: selected ? '700' : '400' }}>{o.label}</ThemedText>
              {selected && <Icon name="check" size={20} color={theme.primary} decorative />}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}
