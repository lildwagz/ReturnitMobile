import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { BucketIcon } from '@/components/bucket-ui';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { bucketDisplayName, useBuckets } from '@/lib/buckets';

// The "Bucket" field of the purchase form: shows where the purchase will live and who will see it, and opens a list to
// choose another bucket. It only exists for people who are in more than one bucket. `value` null means the personal one.
export function BucketPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const theme = useTheme();
  const buckets = useBuckets(true).data;
  const [open, setOpen] = useState(false);
  if (!buckets || buckets.length < 2) return null;

  const current = buckets.find((b) => b.id === value) ?? buckets.find((b) => b.personal) ?? buckets[0];
  const help = current.memberCount > 1 ? t('bk.visibleTo', { n: current.memberCount }) : t('bk.onlyYouSee');
  return (
    <View>
      <ThemedText type="small">{t('bk.field')}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('bk.field') + ': ' + bucketDisplayName(current)}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          borderRadius: Radius.sm,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.backgroundElement,
          opacity: pressed ? 0.85 : 1,
        })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <BucketIcon bucket={current} size={28} />
          <ThemedText style={{ fontWeight: '700' }}>{bucketDisplayName(current)}</ThemedText>
        </View>
        <Icon name="chevron-down" size={20} color={theme.textSecondary} decorative />
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: Spacing.one }}>
        <Icon name={current.memberCount > 1 ? 'users' : 'lock'} size={20} color={theme.textSecondary} decorative />
        <ThemedText type="small" themeColor="textSecondary">
          {help}
        </ThemedText>
      </View>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={t('bk.field')}>
        <ScrollView style={{ maxHeight: 420 }}>
          {buckets.map((b) => {
            const selected = b.id === current.id;
            return (
              <Pressable
                key={b.id}
                accessibilityRole="button"
                accessibilityLabel={bucketDisplayName(b)}
                accessibilityState={{ selected }}
                onPress={() => {
                  onChange(b.id);
                  setOpen(false);
                }}
                android_ripple={{ color: theme.primary + '1F' }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.three,
                  minHeight: 48,
                  paddingHorizontal: Spacing.two,
                  opacity: pressed ? 0.85 : 1,
                })}>
                <BucketIcon bucket={b} size={32} />
                <ThemedText style={{ flex: 1, fontWeight: selected ? '700' : '400' }}>{bucketDisplayName(b)}</ThemedText>
                {selected && <Icon name="check" size={20} color={theme.primary} decorative />}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
