import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, I18nManager, Pressable, ScrollView, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { NameSheet } from '@/components/bucket-sheets';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { Bucket, bucketDisplayName, createBucket, selectBucket, useBuckets } from '@/lib/buckets';
import { useSignedIn } from '@/lib/use-signed-in';

function subtitle(b: Bucket): string {
  if (b.personal || b.memberCount < 2) return t('bk.onlyYou', { purchases: b.purchaseCount });
  const base = t('bk.counts', { members: b.memberCount, purchases: b.purchaseCount });
  return b.notify ? base : base + ' · ' + t('bk.muted');
}

export default function BucketsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const signedIn = useSignedIn() === true;
  const query = useBuckets(signedIn);
  const [creating, setCreating] = useState(false);
  const buckets = query.data ?? [];
  const hasShared = buckets.some((b) => !b.personal);

  async function create(name: string): Promise<string | null> {
    const r = await createBucket(name);
    if (!r.ok) return r.error;
    setCreating(false);
    selectBucket(null);
    router.push(('/buckets/' + r.data.id) as never);
    return null;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: 80 }}>
        <ThemedText themeColor="textSecondary">{t('bk.subtitle')}</ThemedText>

        {query.isLoading && <ActivityIndicator />}
        {query.error && (
          <View style={{ gap: Spacing.two }}>
            <ThemedText themeColor="errorText">{query.error.message}</ThemedText>
            <AppButton variant="secondary" title={t('home.retry')} onPress={() => query.refetch()} />
          </View>
        )}

        {buckets.length > 0 && (
          <View style={{ borderRadius: Radius.md, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border, paddingHorizontal: Spacing.three }}>
            {buckets.map((b, i) => (
              <Pressable
                key={b.id}
                // The personal bucket has nothing to manage: it is only listed so the counts add up.
                disabled={b.personal}
                accessibilityRole={b.personal ? undefined : 'button'}
                accessibilityLabel={bucketDisplayName(b) + ', ' + (b.role === 'owner' ? t('bk.owner') : t('bk.member')) + ', ' + subtitle(b)}
                onPress={() => router.push(('/buckets/' + b.id) as never)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.three,
                  minHeight: 64,
                  paddingVertical: Spacing.two,
                  opacity: pressed ? 0.85 : 1,
                  borderBottomWidth: i === buckets.length - 1 ? 0 : 1,
                  borderBottomColor: theme.border,
                })}>
                <View style={{ width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundSelected }}>
                  <Icon name={b.personal ? 'user' : 'home'} size={20} color={theme.primary} decorative />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                    <ThemedText style={{ fontWeight: '700', flexShrink: 1 }}>{bucketDisplayName(b)}</ThemedText>
                    {!b.personal && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {b.role === 'owner' ? t('bk.owner') : t('bk.member')}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {subtitle(b)}
                  </ThemedText>
                </View>
                {!b.personal && <Icon name="chevron-right" size={20} color={theme.textSecondary} flip={I18nManager.isRTL} decorative />}
              </Pressable>
            ))}
          </View>
        )}

        {!query.isLoading && !hasShared && !query.error && (
          <EmptyState icon="users" title={t('bk.emptyTitle')} help={t('bk.emptyHelp')} />
        )}

        <AppButton title={t('bk.create')} onPress={() => setCreating(true)} />
        <AppButton variant="secondary" title={t('bk.haveCode')} onPress={() => router.push('/join' as never)} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('bk.haveCodeHelp')}
        </ThemedText>
      </ScrollView>

      {creating && (
        <NameSheet
          visible
          title={t('bk.createTitle')}
          help={t('bk.nameHelp')}
          initial=""
          actionTitle={t('bk.create')}
          onSubmit={create}
          onClose={() => setCreating(false)}
        />
      )}
    </ThemedView>
  );
}
