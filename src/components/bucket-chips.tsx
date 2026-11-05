import { Pressable, ScrollView } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
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
    { id: null as string | null, label: t('bk.all'), count: buckets.reduce((n, b) => n + b.purchaseCount, 0) },
    ...buckets.map((b) => ({ id: b.id as string | null, label: bucketDisplayName(b), count: b.purchaseCount })),
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
              paddingHorizontal: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: on ? Brand.primary : theme.border,
              backgroundColor: on ? Brand.primary : theme.backgroundElement,
              opacity: pressed ? 0.85 : 1,
            })}>
            {/* A check as well as the fill, so the selection never depends on colour alone. */}
            {on && <Icon name="check" size={20} color="#FFFFFF" decorative />}
            <ThemedText type="small" style={{ color: on ? '#FFFFFF' : theme.text, fontWeight: on ? '700' : '400' }}>
              {c.label}
            </ThemedText>
            <ThemedText type="small" style={{ color: on ? '#FFFFFFD9' : theme.textSecondary }}>
              {c.count}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
