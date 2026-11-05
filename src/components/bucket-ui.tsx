import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Bucket } from '@/lib/buckets';
import { PERSONAL_COLOR, colorFor, initialOf } from '@/lib/bucket-style';

export function bucketColor(b: Pick<Bucket, 'id' | 'personal'>): string {
  return b.personal ? PERSONAL_COLOR : colorFor(b.id);
}

// The bucket's own tile: a rounded square in its colour with a house (shared) or a person (personal).
// Decorative: the name is always written next to it.
export function BucketIcon({ bucket, size = 44 }: { bucket: Pick<Bucket, 'id' | 'personal'>; size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: bucketColor(bucket),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={bucket.personal ? 'user' : 'home'} size={size >= 52 ? 24 : 20} color="#FFFFFF" decorative />
    </View>
  );
}

// A person as a coloured circle with their initial. `ring` is the colour of what is behind it, so stacked avatars
// are separated by a clean edge.
export function Avatar({ id, name, size = 40, ring }: { id: string; name: string; size?: number; ring?: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colorFor(id),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? 2 : 0,
        borderColor: ring,
      }}>
      <ThemedText maxFontSizeMultiplier={1.2} style={{ color: '#FFFFFF', fontWeight: '700', fontSize: size * 0.4, lineHeight: size * 0.55 }}>
        {initialOf(name)}
      </ThemedText>
    </View>
  );
}

// Overlapping avatars of the first few members, with "+n" for the rest. Reads as nothing to a screen reader: the member
// count is already written next to it.
export function AvatarStack({ people, total, size = 28, ring }: { people: { id: string; name: string }[]; total: number; size?: number; ring: string }) {
  const theme = useTheme();
  if (people.length === 0) return null;
  const extra = total - people.length;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'center' }}>
      {people.map((p, i) => (
        <View key={p.id} style={{ marginStart: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar id={p.id} name={p.name} size={size} ring={ring} />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{
            marginStart: -size * 0.3,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.backgroundSelected,
            borderWidth: 2,
            borderColor: ring,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <ThemedText maxFontSizeMultiplier={1.2} style={{ color: theme.textSecondary, fontWeight: '700', fontSize: size * 0.36, lineHeight: size * 0.5 }}>
            +{extra}
          </ThemedText>
        </View>
      )}
    </View>
  );
}
