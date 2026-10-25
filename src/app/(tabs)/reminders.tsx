import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { PurchaseRow } from '@/components/purchase-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { t } from '@/i18n';
import { apiFetch } from '@/lib/auth';
import { connectionError, errorMessage } from '@/lib/purchase';
import { useAttention, useNotifications, useRefetchStaleOnFocus } from '@/lib/queries';
import { keys, queryClient } from '@/lib/query-client';
import { useSignedIn } from '@/lib/use-signed-in';
import { AppButton } from '@/components/app-button';
import { SnoozeChoice, SnoozeSheet } from '@/components/snooze-sheet';
import { formatDate } from '@/lib/warranty';
import { showToast } from '@/lib/toast';

type Note = {
  id: string;
  purchaseId?: string | null;
  kind?: 'warranty' | 'return';
  snoozeUntil?: SnoozeChoice[];
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export default function RemindersScreen() {
  const router = useRouter();
  const { open } = useLocalSearchParams<{ open?: string }>();
  const signedIn = useSignedIn() === true; // the tabs only exist while signed in

  const [unreadOnly, setUnreadOnly] = useState(false);
  const notesQuery = useNotifications<Note>(unreadOnly, signedIn);
  const notes = notesQuery.data ?? [];
  // Purchases whose warranty ends within 30 days or has ended (what the prototype lists under "perlu diperhatikan").
  const attentionQuery = useAttention(signedIn);
  const attention = attentionQuery.data ?? [];
  const notesError = notesQuery.error ? notesQuery.error.message : null;
  const loading = notesQuery.isFetching || attentionQuery.isFetching;
  const handledOpen = useRef<string | null>(null);

  async function loadAll() {
    await Promise.all([notesQuery.refetch(), attentionQuery.refetch()]);
  }

  // Coming into view: refresh whatever is older than its staleTime.
  useRefetchStaleOnFocus(['notifications']);
  useRefetchStaleOnFocus(keys.purchases);

  // Opens the reminder that was tapped in a push notification.
  useEffect(() => {
    if (!open || handledOpen.current === open) return;
    const n = notes.find((x) => x.id === open);
    if (n) {
      handledOpen.current = open;
      openNote(n);
    }
  }, [open, notes]);

  // "Remind me again": the server marks this reminder read and schedules a copy (tomorrow, in 3 days, next week).
  const [snoozing, setSnoozing] = useState<Note | null>(null);
  const [snoozeBusy, setSnoozeBusy] = useState(false);

  async function snooze(choice: SnoozeChoice) {
    if (!snoozing) return;
    setSnoozeBusy(true);
    try {
      const res = await apiFetch('/notifications/' + snoozing.id + '/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ until: choice }),
      });
      if (res.ok) {
        const at = new Date((await res.json()).scheduledAt);
        const day = at.getFullYear() + '-' + String(at.getMonth() + 1).padStart(2, '0') + '-' + String(at.getDate()).padStart(2, '0');
        const time = String(at.getHours()).padStart(2, '0') + '.' + String(at.getMinutes()).padStart(2, '0');
        showToast(t('rem.snoozed', { date: formatDate(day), time }));
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } else if (res.status === 422) {
        showToast(t('rem.snoozeNotPossible'));
      } else {
        showToast(await errorMessage(res));
      }
    } catch {
      showToast(connectionError());
    } finally {
      setSnoozeBusy(false);
      setSnoozing(null);
    }
  }

  async function openNote(n: Note) {
    if (!n.read) {
      try {
        const res = await apiFetch('/notifications/' + n.id + '/read', { method: 'POST' });
        if (res.status === 204) {
          queryClient.setQueriesData<Note[]>({ queryKey: ['notifications'] }, (old) =>
            old?.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
          );
        }
      } catch {
        // Marking as read is best effort; opening the purchase still works.
      }
    }
    if (n.purchaseId) router.push(('/purchase/' + n.purchaseId) as never);
  }

  const header = (
    <View style={{ gap: 10, paddingBottom: 12 }}>
      <View style={{ gap: 4 }}>
        <ThemedText type="title">{t('rem.title')}</ThemedText>
        <ThemedText themeColor="textSecondary">{t('rem.subtitle')}</ThemedText>
      </View>
      <View style={{ alignSelf: 'flex-start' }}>
        <AppButton small variant="secondary" title={t('rem.settings')} onPress={() => router.push('/reminder-settings' as never)} />
      </View>

      <ThemedText type="subtitle" style={{ fontSize: 18, lineHeight: 24, marginTop: 4 }}>
        {t('rem.history')}
      </ThemedText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <ThemedText type="small">{t('rem.unreadOnly')}</ThemedText>
        <Switch value={unreadOnly} onValueChange={setUnreadOnly} />
      </View>
      {notesError && <ThemedText themeColor="errorText">{notesError}</ThemedText>}
      {notesError && <AppButton variant="secondary" title={t('rem.retry')} onPress={loadAll} />}
    </View>
  );

  // Under the history: purchases whose warranty ends soon or has ended.
  const footer = (
    <View style={{ gap: 10, paddingTop: 20 }}>
      <ThemedText type="subtitle" style={{ fontSize: 18, lineHeight: 24 }}>
        {t('rem.attentionTitle')}
      </ThemedText>
      {attention.length === 0 ? (
        <EmptyState title={t('rem.attentionEmpty')} help={t('rem.attentionEmptyHelp')} />
      ) : (
        attention.map((p) => (
          <PurchaseRow key={p.id} p={p} onPress={() => router.push(('/purchase/' + p.id) as never)} />
        ))
      )}
    </View>
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 16 }}>
        <SnoozeSheet visible={snoozing !== null} choices={snoozing?.snoozeUntil ?? []} busy={snoozeBusy} onPick={snooze} onClose={() => setSnoozing(null)} />
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          refreshing={loading}
          onRefresh={loadAll}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                title={unreadOnly ? t('rem.emptyUnread') : t('rem.empty')}
                help={t('rem.emptyHelp')}
              />
            )
          }
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => openNote(item)}>
              <ThemedView
                type="backgroundElement"
                style={{
                  padding: 14,
                  borderRadius: 14,
                  gap: 4,
                  borderStartWidth: item.read ? 0 : 4,
                  borderStartColor: Brand.primary,
                }}>
                <ThemedText style={{ fontWeight: item.read ? '400' : '700' }}>{item.title}</ThemedText>
                <ThemedText type="small">{item.body}</ThemedText>
                <ThemedText type="small">{new Date(item.createdAt).toLocaleString()}</ThemedText>
                {item.purchaseId && item.snoozeUntil && item.snoozeUntil.length > 0 ? (
                  <View style={{ alignSelf: 'flex-start', marginTop: 6 }}>
                    <AppButton small variant="secondary" title={t('rem.snooze')} onPress={() => setSnoozing(item)} />
                  </View>
                ) : null}
              </ThemedView>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}