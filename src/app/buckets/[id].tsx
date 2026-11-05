import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Switch, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BottomSheet } from '@/components/bottom-sheet';
import { DeleteBucketSheet, NameSheet } from '@/components/bucket-sheets';
import { Avatar, BucketIcon } from '@/components/bucket-ui';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Tile } from '@/components/tile';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import {
  Member,
  MAX_MEMBERS,
  createInvite,
  deleteBucket,
  inviteShareText,
  removeMember,
  renameBucket,
  selectBucket,
  setNotify,
  transferOwner,
  useBuckets,
  useMembers,
} from '@/lib/buckets';
import { showToast } from '@/lib/toast';
import { useSignedIn } from '@/lib/use-signed-in';

type InviteState = { busy: boolean; token?: string; error?: string };

// A new invite is made every time the sheet opens, so the person always shares a link that works and an old one stops.
function InviteSheet({ bucketName, state, onNew, onClose }: { bucketName: string; state: InviteState; onNew: () => void; onClose: () => void }) {
  const theme = useTheme();
  async function share() {
    if (!state.token) return;
    try {
      await Share.share({ message: inviteShareText(bucketName, state.token) });
    } catch {
      showToast(t('error.generic'));
    }
  }

  // The code is shown in big boxes of four so it can be read out or typed.
  const groups = state.token ? (state.token.match(/.{1,4}/g) ?? []) : [];
  return (
    <BottomSheet visible onClose={onClose} title={t('bk.inviteTitle', { name: bucketName })}>
      <View style={{ gap: Spacing.three }}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('bk.inviteHelp', { n: MAX_MEMBERS })}
        </ThemedText>
        {state.busy && <ActivityIndicator />}
        {state.error && (
          <ThemedText accessibilityLiveRegion="polite" themeColor="errorText">
            {state.error}
          </ThemedText>
        )}
        {state.token && (
          <>
            <View accessible accessibilityLabel={t('bk.inviteCode', { code: groups.join(' ') })} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two }}>
              {groups.map((g, i) => (
                <View key={i} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: Radius.sm, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.backgroundElement }}>
                  <ThemedText selectable style={{ fontWeight: '700', fontSize: 18, lineHeight: 24, letterSpacing: 2 }}>
                    {g}
                  </ThemedText>
                </View>
              ))}
            </View>
            <AppButton title={t('bk.shareLink')} onPress={share} />
            <AppButton variant="secondary" title={t('bk.newLink')} onPress={onNew} />
          </>
        )}
        {state.error && !state.busy && <AppButton variant="secondary" title={t('home.retry')} onPress={onNew} />}
      </View>
    </BottomSheet>
  );
}

function SectionLabel({ children, danger }: { children: string; danger?: boolean }) {
  return (
    <ThemedText
      accessibilityRole="header"
      type="small"
      themeColor={danger ? 'errorText' : 'textSecondary'}
      style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: Spacing.two }}>
      {children}
    </ThemedText>
  );
}

export default function BucketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const signedIn = useSignedIn() === true;
  const buckets = useBuckets(signedIn).data;
  const bucket = buckets?.find((b) => b.id === id);
  const members = useMembers(String(id), signedIn && !!bucket);
  const [invite, setInvite] = useState<InviteState | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [picked, setPicked] = useState<Member | null>(null); // the member whose actions are open
  const [message, setMessage] = useState<string | null>(null);

  // The bucket is gone (deleted, or the person left): back to the list.
  const gone = !!buckets && !bucket;
  useEffect(() => {
    if (gone) router.replace('/buckets' as never);
  }, [gone, router]);

  if (!bucket) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const bid = bucket.id; // the guard above does not reach the closures below
  const bname = bucket.name;
  const owner = bucket.role === 'owner';
  const list = members.data ?? [];

  async function startInvite() {
    setInvite({ busy: true });
    const r = await createInvite(bid);
    setInvite(r.ok ? { busy: false, token: r.data.token } : { busy: false, error: r.error });
  }

  async function leave() {
    const me = list.find((m) => m.you);
    if (!me) return;
    const r = await removeMember(bid, me.id);
    if (!r.ok) setMessage(r.error);
    else selectBucket(null);
  }

  function confirmLeave() {
    Alert.alert(t('bk.leaveTitle', { name: bname }), t('bk.leaveBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('bk.leave'), style: 'destructive', onPress: leave },
    ]);
  }

  function confirmRemove(m: Member) {
    setPicked(null);
    Alert.alert(t('bk.removeTitle', { name: m.name }), t('bk.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('bk.remove'),
        style: 'destructive',
        onPress: async () => {
          const r = await removeMember(bid, m.id);
          if (!r.ok) setMessage(r.error);
        },
      },
    ]);
  }

  function confirmTransfer(m: Member) {
    setPicked(null);
    Alert.alert(t('bk.transferTitle', { name: m.name }), t('bk.transferBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('bk.transfer'),
        onPress: async () => {
          const r = await transferOwner(bid, m.id);
          if (!r.ok) setMessage(r.error);
        },
      },
    ]);
  }

  async function toggleNotify(on: boolean) {
    const r = await setNotify(bid, on);
    if (!r.ok) setMessage(r.error);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: bname }} />
      <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: 80 }}>
        {/* The bucket at a glance: its icon, the counts and the one main action. */}
        <Tile padding={Spacing.three} gap={Spacing.three}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <BucketIcon bucket={bucket} size={56} />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText accessibilityRole="header" style={{ fontWeight: '700', fontSize: 20, lineHeight: 26 }} numberOfLines={2}>
                {bname}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('bk.counts', { members: bucket.memberCount, purchases: bucket.purchaseCount })}
              </ThemedText>
            </View>
          </View>
          {owner && <AppButton title={t('bk.invite')} onPress={startInvite} />}
        </Tile>

        <SectionLabel>{t('bk.members')}</SectionLabel>
        <Tile padding={Spacing.three} gap={0}>
          {members.isLoading && <ActivityIndicator style={{ padding: Spacing.three }} />}
          {list.map((m, i) => {
            const roleText = m.role === 'owner' ? t('bk.owner') : t('bk.member');
            const manageable = owner && !m.you;
            return (
              <Pressable
                key={m.id}
                disabled={!manageable}
                accessibilityRole={manageable ? 'button' : undefined}
                accessibilityLabel={t('bk.memberA11y', { name: m.name + (m.you ? ', ' + t('bk.you') : ''), role: roleText })}
                onPress={() => setPicked(m)}
                android_ripple={{ color: theme.primary + '1F' }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.three,
                  minHeight: 60,
                  opacity: pressed ? 0.85 : 1,
                  borderBottomWidth: i === list.length - 1 ? 0 : 1,
                  borderBottomColor: theme.border,
                })}>
                <Avatar id={m.id} name={m.name} size={40} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: '700' }} numberOfLines={1}>
                    {m.name}
                    {m.you ? ' ' + t('bk.you2') : ''}
                  </ThemedText>
                  {!m.you && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {roleText}
                    </ThemedText>
                  )}
                </View>
                {m.role === 'owner' ? (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, backgroundColor: Brand.primarySoft }}>
                    <ThemedText type="small" style={{ color: Brand.primaryDark, fontWeight: '700' }}>
                      {t('bk.owner')}
                    </ThemedText>
                  </View>
                ) : (
                  manageable && <Icon name="more-horizontal" size={20} color={theme.textSecondary} decorative />
                )}
              </Pressable>
            );
          })}
        </Tile>

        <Tile padding={Spacing.three}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <View style={{ width: 40, height: 40, borderRadius: Radius.sm, backgroundColor: theme.backgroundSelected, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={bucket.notify ? 'bell' : 'bell-off'} size={20} color={theme.primary} decorative />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText style={{ fontWeight: '700' }}>{t('bk.notify')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('bk.notifyHelp')}
              </ThemedText>
            </View>
            <Switch value={bucket.notify} onValueChange={toggleNotify} accessibilityLabel={t('bk.notify')} />
          </View>
        </Tile>

        {message && (
          <ThemedText accessibilityLiveRegion="polite" themeColor="errorText">
            {message}
          </ThemedText>
        )}

        <SectionLabel danger>{t('bk.danger')}</SectionLabel>
        {owner ? (
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <View style={{ flex: 1 }}>
              <AppButton variant="secondary" title={t('bk.rename')} onPress={() => setRenaming(true)} />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton variant="danger" title={t('bk.delete')} onPress={() => setDeleting(true)} />
            </View>
          </View>
        ) : (
          <AppButton variant="danger" title={t('bk.leave')} onPress={confirmLeave} />
        )}
      </ScrollView>

      {invite && <InviteSheet bucketName={bname} state={invite} onNew={startInvite} onClose={() => setInvite(null)} />}
      {renaming && (
        <NameSheet
          visible
          title={t('bk.rename')}
          initial={bname}
          actionTitle={t('bk.save')}
          onSubmit={async (name) => {
            const r = await renameBucket(bid, name);
            if (!r.ok) return r.error;
            setRenaming(false);
            return null;
          }}
          onClose={() => setRenaming(false)}
        />
      )}
      {deleting && (
        <DeleteBucketSheet
          visible
          name={bname}
          onConfirm={async () => {
            const r = await deleteBucket(bid, bname);
            if (!r.ok) return r.error;
            selectBucket(null);
            setDeleting(false);
            return null;
          }}
          onClose={() => setDeleting(false)}
        />
      )}
      <BottomSheet visible={!!picked} onClose={() => setPicked(null)} title={picked?.name}>
        {picked && (
          <View style={{ gap: Spacing.two }}>
            <AppButton variant="secondary" title={t('bk.transfer')} onPress={() => confirmTransfer(picked)} />
            <AppButton variant="danger" title={t('bk.remove')} onPress={() => confirmRemove(picked)} />
          </View>
        )}
      </BottomSheet>
    </ThemedView>
  );
}
