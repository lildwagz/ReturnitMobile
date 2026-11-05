import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { bucketColor } from '@/components/bucket-ui';
import { bucketDisplayName, selectBucket, useBuckets, useSelectedBucket } from '@/lib/buckets';
import { useSignedIn } from '@/lib/use-signed-in';

// The bucket switcher of Home, Pembelian and Tenggat: "All" and one chip per bucket. It only exists for people who are in
// more than one bucket, so everyone who never shares sees the screens exactly as before.
export function BucketChips() {
  const theme = useTheme();
  const signedIn = useSignedIn() === true;
  const buckets = useBuckets(signedIn).data;
  const selected = useSelectedBucket();
  if (!buckets || buckets.length < 2) return null;

  const chips = [
    { id: null as string | null, label: t('bk.all'), count: buckets.reduce((n, b) => n + b.purchaseCount, 0), color: null as string | null },
    ...buckets.map((b) => ({ id: b.id as string | null, label: bucketDisplayName(b), count: b.purchaseCount, color: bucketColor(b) as string | null })),
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={t('bk.switcherLabel')}
      contentContainerStyle={{ gap: Spacing.two, paddingVertical: 2 }}>
      {chips.map((c) => {
        const on = selected === c.id;
        return (
          <Pressable
            key={c.id ?? 'all'}
            accessibilityRole="button"
            accessibilityLabel={t('bk.chipA11y', { name: c.label, n: c.count })}
            accessibilityState={{ selected: on }}
            onPress={() => selectBucket(c.id)}
            android_ripple={{ color: theme.primary + '1F' }}
            style={({ pressed }) => ({
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingStart: 12,
              paddingEnd: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: on ? theme.text : theme.border,
              backgroundColor: on ? theme.text : theme.backgroundElement,
              opacity: pressed ? 0.85 : 1,
            })}>
            {/* A check on the chosen chip as well as its dark fill, so the choice never depends on colour alone; the others show their bucket's colour. */}
            {on ? (
              <Icon name="check" size={20} color={theme.background} decorative />
            ) : c.color ? (
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color, marginHorizontal: 5 }} />
            ) : (
              <Icon name="layers" size={20} color={theme.textSecondary} decorative />
            )}
            <ThemedText type="small" style={{ color: on ? theme.background : theme.text, fontWeight: on ? '700' : '400' }}>
              {c.label}
            </ThemedText>
            <ThemedText type="small" style={{ color: on ? theme.background : theme.textSecondary, opacity: on ? 0.8 : 1 }}>
              {c.count}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
