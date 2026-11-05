import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, I18nManager, Pressable, ScrollView, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AvatarStack, BucketIcon, bucketColor } from '@/components/bucket-ui';
import { NameSheet } from '@/components/bucket-sheets';
import { Icon, type FeatherName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Tile } from '@/components/tile';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { Bucket, bucketDisplayName, createBucket, selectBucket, useBuckets } from '@/lib/buckets';
import { useSignedIn } from '@/lib/use-signed-in';

function counts(b: Bucket): string {
  if (b.personal || b.memberCount < 2) return t('bk.onlyYou', { purchases: b.purchaseCount });
  return t('bk.counts', { members: b.memberCount, purchases: b.purchaseCount });
}

function RolePill({ role }: { role: Bucket['role'] }) {
  const theme = useTheme();
  const owner = role === 'owner';
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: owner ? Brand.primarySoft : theme.backgroundSelected,
      }}>
      <ThemedText type="small" style={{ color: owner ? Brand.primaryDark : theme.textSecondary, fontWeight: '700' }}>
        {owner ? t('bk.owner') : t('bk.member')}
      </ThemedText>
    </View>
  );
}

// The card of a shared bucket: its own colour and icon, the role, the counts and who is in it.
function BucketCard({ b, onPress }: { b: Bucket; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Tile
      padding={Spacing.three}
      onPress={onPress}
      accessibilityLabel={bucketDisplayName(b) + ', ' + (b.role === 'owner' ? t('bk.owner') : t('bk.member')) + ', ' + counts(b) + (b.notify ? '' : ', ' + t('bk.muted'))}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <BucketIcon bucket={b} />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText style={{ fontWeight: '700', fontSize: 17, lineHeight: 22 }} numberOfLines={1}>
            {bucketDisplayName(b)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {counts(b)}
          </ThemedText>
        </View>
        <RolePill role={b.role} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }}>
        <AvatarStack people={b.members ?? []} total={b.memberCount} ring={theme.backgroundElement} />
        {!b.notify && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="bell-off" size={20} color={theme.textSecondary} decorative />
            <ThemedText type="small" themeColor="textSecondary">
              {t('bk.muted')}
            </ThemedText>
          </View>
        )}
        <Icon name="chevron-right" size={20} color={theme.textSecondary} flip={I18nManager.isRTL} decorative />
      </View>
    </Tile>
  );
}

// The first screen when nobody shares yet: a call to action, and what a bucket is in three steps.
function Hero({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={{ borderRadius: Radius.xl, padding: Spacing.four, backgroundColor: Brand.primary, overflow: 'hidden', gap: Spacing.two }}>
      {/* two soft circles, the only decoration */}
      <View pointerEvents="none" style={{ position: 'absolute', end: -30, top: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: '#FFFFFF1A' }} />
      <View pointerEvents="none" style={{ position: 'absolute', end: 50, bottom: -36, width: 84, height: 84, borderRadius: 42, backgroundColor: '#FFFFFF1A' }} />
      <ThemedText accessibilityRole="header" style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 20, lineHeight: 26, maxWidth: 240 }}>
        {t('bk.heroTitle')}
      </ThemedText>
      <ThemedText style={{ color: '#FFFFFFE6', fontSize: 14, lineHeight: 20, maxWidth: 250 }}>{t('bk.heroHelp')}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('bk.create')}
        onPress={onCreate}
        android_ripple={{ color: Brand.primary + '33' }}
        style={({ pressed }) => ({
          alignSelf: 'flex-start',
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 18,
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          marginTop: Spacing.one,
          opacity: pressed ? 0.9 : 1,
        })}>
        <Icon name="plus" size={20} color={Brand.primaryDark} decorative />
        <ThemedText style={{ color: Brand.primaryDark, fontWeight: '700' }}>{t('bk.create')}</ThemedText>
      </Pressable>
    </View>
  );
}

function Step({ n, icon, title, help }: { n: number; icon: FeatherName; title: string; help: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.backgroundSelected, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={theme.primary} decorative />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontWeight: '700' }}>
          {n}. {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {help}
        </ThemedText>
      </View>
    </View>
  );
}

export default function BucketsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const signedIn = useSignedIn() === true;
  const query = useBuckets(signedIn);
  const [creating, setCreating] = useState(false);
  const buckets = query.data ?? [];
  const shared = buckets.filter((b) => !b.personal);
  const personal = buckets.find((b) => b.personal);
  const ready = !query.isLoading && !query.error;

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
        {query.isLoading && <ActivityIndicator />}
        {query.error && (
          <View style={{ gap: Spacing.two }}>
            <ThemedText themeColor="errorText">{query.error.message}</ThemedText>
            <AppButton variant="secondary" title={t('home.retry')} onPress={() => query.refetch()} />
          </View>
        )}

        {ready && shared.length === 0 && (
          <>
            <Hero onCreate={() => setCreating(true)} />
            <ThemedText accessibilityRole="header" type="small" themeColor="textSecondary" style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {t('bk.howTitle')}
            </ThemedText>
            <Tile padding={Spacing.three} gap={Spacing.three}>
              <Step n={1} icon="edit-3" title={t('bk.step1')} help={t('bk.step1Help')} />
              <Step n={2} icon="send" title={t('bk.step2')} help={t('bk.step2Help')} />
              <Step n={3} icon="users" title={t('bk.step3')} help={t('bk.step3Help')} />
            </Tile>
          </>
        )}

        {shared.map((b) => (
          <BucketCard key={b.id} b={b} onPress={() => router.push(('/buckets/' + b.id) as never)} />
        ))}

        {/* The personal bucket has nothing to manage: it is only listed so the counts add up. */}
        {ready && personal && shared.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.one, paddingTop: Spacing.one }}>
            <BucketIcon bucket={personal} size={36} />
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontWeight: '700' }}>{bucketDisplayName(personal)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {counts(personal)}
              </ThemedText>
            </View>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: bucketColor(personal) }} />
          </View>
        )}

        {ready && shared.length > 0 && <AppButton title={t('bk.create')} onPress={() => setCreating(true)} />}
        {ready && (
          <>
            <AppButton variant="secondary" title={t('bk.haveCode')} onPress={() => router.push('/join' as never)} />
            <ThemedText type="small" themeColor="textSecondary" style={{ color: theme.textSecondary }}>
              {t('bk.haveCodeHelp')}
            </ThemedText>
          </>
        )}
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
