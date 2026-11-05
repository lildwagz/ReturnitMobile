import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Switch, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BottomSheet } from '@/components/bottom-sheet';
import { DeleteBucketSheet, NameSheet } from '@/components/bucket-sheets';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
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
  async function share() {
    if (!state.token) return;
    try {
      await Share.share({ message: inviteShareText(bucketName, state.token) });
    } catch {
      showToast(t('error.generic'));
    }
  }

  // The code is shown in groups of four so it can be read out or typed.
  const code = state.token ? (state.token.match(/.{1,4}/g) ?? []).join('-') : '';
  return (
    <BottomSheet visible onClose={onClose} title={t('bk.inviteTitle', { name: bucketName })}>
      <View style={{ gap: Spacing.two }}>
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
            <ThemedText selectable style={{ fontWeight: '700', letterSpacing: 1 }}>
              {t('bk.inviteCode', { code })}
            </ThemedText>
            <AppButton title={t('bk.shareLink')} onPress={share} />
            <AppButton variant="secondary" title={t('bk.newLink')} onPress={onNew} />
          </>
        )}
        {state.error && !state.busy && <AppButton variant="secondary" title={t('home.retry')} onPress={onNew} />}
      </View>
    </BottomSheet>
  );
}

export default function BucketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const signedIn = useSignedIn() === true;
  const bucket = useBuckets(signedIn).data?.find((b) => b.id === id);
  const members = useMembers(String(id), signedIn && !!bucket);
  const [invite, setInvite] = useState<InviteState | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [picked, setPicked] = useState<Member | null>(null); // the member whose actions are open
  const [message, setMessage] = useState<string | null>(null);

  // The bucket is gone (deleted, or the person left): back to the list.
  const gone = !!useBuckets(signedIn).data && !bucket;
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
  const owner = bucket.role === 'owner';
  const list = members.data ?? [];

  async function startInvite() {
    setInvite({ busy: true });
    const r = await createInvite(String(id));
    setInvite(r.ok ? { busy: false, token: r.data.token } : { busy: false, error: r.error });
  }

  async function leave() {
    const me = list.find((m) => m.you);
    if (!me || !bucket) return;
    const r = await removeMember(bucket.id, me.id);
    if (!r.ok) setMessage(r.error);
    else selectBucket(null);
  }

  function confirmLeave() {
    if (!bucket) return;
    Alert.alert(t('bk.leaveTitle', { name: bucket.name }), t('bk.leaveBody'), [
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
    if (!bucket) return;
    const r = await setNotify(bucket.id, on);
    if (!r.ok) setMessage(r.error);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: bucket.name }} />
      <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: 80 }}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('bk.counts', { members: bucket.memberCount, purchases: bucket.purchaseCount })} · {owner ? t('bk.owner') : t('bk.member')}
        </ThemedText>

        {owner && <AppButton title={t('bk.invite')} onPress={startInvite} />}

        <ThemedText accessibilityRole="header" type="small" themeColor="textSecondary" style={{ fontWeight: '700' }}>
          {t('bk.members')}
        </ThemedText>
        <View style={{ borderRadius: Radius.md, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border, paddingHorizontal: Spacing.three }}>
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
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.three,
                  minHeight: 56,
                  opacity: pressed ? 0.85 : 1,
                  borderBottomWidth: i === list.length - 1 ? 0 : 1,
                  borderBottomColor: theme.border,
                })}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <ThemedText style={{ color: '#FFFFFF', fontWeight: '700' }}>{m.name.slice(0, 1).toUpperCase()}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: '700' }} numberOfLines={1}>
                    {m.name}
                    {m.you ? ' (' + t('bk.you') + ')' : ''}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {roleText}
                  </ThemedText>
                </View>
                {manageable && (
                  <ThemedText type="small" themeColor="textSecondary">
                    ⋯
                  </ThemedText>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 56 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText style={{ fontWeight: '700' }}>{t('bk.notify')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('bk.notifyHelp')}
            </ThemedText>
          </View>
          <Switch value={bucket.notify} onValueChange={toggleNotify} accessibilityLabel={t('bk.notify')} />
        </View>

        {message && (
          <ThemedText accessibilityLiveRegion="polite" themeColor="errorText">
            {message}
          </ThemedText>
        )}

        {owner ? (
          <>
            <AppButton variant="secondary" title={t('bk.rename')} onPress={() => setRenaming(true)} />
            <AppButton variant="danger" title={t('bk.delete')} onPress={() => setDeleting(true)} />
          </>
        ) : (
          <AppButton variant="danger" title={t('bk.leave')} onPress={confirmLeave} />
        )}
      </ScrollView>

      {invite && <InviteSheet bucketName={bucket.name} state={invite} onNew={startInvite} onClose={() => setInvite(null)} />}
      {renaming && (
        <NameSheet
          visible
          title={t('bk.rename')}
          initial={bucket.name}
          actionTitle={t('bk.save')}
          onSubmit={async (name) => {
            const r = await renameBucket(bucket.id, name);
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
          name={bucket.name}
          onConfirm={async () => {
            const r = await deleteBucket(bucket.id, bucket.name);
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
