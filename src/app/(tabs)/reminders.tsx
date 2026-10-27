import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { PushOffNotice, Chip, type Prefs } from '@/components/reminder-prefs';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Brand, MaxContentWidth, Radius, SoftShadow, Spacing } from '@/constants/theme';
import { t, tn } from '@/i18n';
import { apiFetch } from '@/lib/auth';
import { connectionError, errorMessage } from '@/lib/purchase';
import { useNotifications, useReminderPrefs, useRefetchStaleOnFocus } from '@/lib/queries';
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

type ListRow = { kind: 'header'; label: string } | { kind: 'note'; note: Note };

// The delivery time in the app language and relative when it is recent:
// minutes, then hours, then "yesterday", then the plain date.
function deliveredAt(createdAt: string): string {
  const at = new Date(createdAt);
  const minutes = Math.floor((Date.now() - at.getTime()) / 60000);
  if (minutes < 1) return t('rem.justNow');
  if (minutes < 60) return tn('minutesAgo', minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tn('hoursAgo', hours);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (yearsSame(at, yesterday)) return t('rem.yesterday');
  return formatDate(
    at.getFullYear() + '-' + String(at.getMonth() + 1).padStart(2, '0') + '-' + String(at.getDate()).padStart(2, '0'),
  );
}

function yearsSame(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Today / This week / Earlier, each with its header row before its notes.
function groupRows(notes: Note[]): ListRow[] {
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const week0 = today0 - 6 * 24 * 60 * 60 * 1000;
  const rows: ListRow[] = [];
  const push = (label: string, bucket: Note[]) => {
    if (bucket.length === 0) return;
    rows.push({ kind: 'header', label });
    bucket.forEach((note) => rows.push({ kind: 'note', note }));
  };
  const byTime = (a: Note, b: Note) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  const inToday: Note[] = [];
  const inWeek: Note[] = [];
  const earlier: Note[] = [];
  notes.forEach((n) => {
    const at = new Date(n.createdAt).getTime();
    if (at >= today0) inToday.push(n);
    else if (at >= week0) inWeek.push(n);
    else earlier.push(n);
  });
  push(t('rem.today'), inToday.sort(byTime));
  push(t('rem.thisWeek'), inWeek.sort(byTime));
  push(t('rem.earlier'), earlier.sort(byTime));
  return rows;
}

export default function RemindersScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { open } = useLocalSearchParams<{ open?: string }>();
  const signedIn = useSignedIn() === true; // the tabs only exist while signed in

  const [unreadOnly, setUnreadOnly] = useState(false);
  const notesQuery = useNotifications<Note>(unreadOnly, signedIn);
  const notes = notesQuery.data ?? [];
  const prefs = useReminderPrefs<Prefs>(signedIn).data ?? null;
  const notesError = notesQuery.error ? notesQuery.error.message : null;
  const loading = notesQuery.isFetching;
  const handledOpen = useRef<string | null>(null);

  async function loadAll() {
    await notesQuery.refetch();
  }

  // Coming into view: refresh whatever is older than its staleTime.
  useRefetchStaleOnFocus(['notifications']);
  useRefetchStaleOnFocus(keys.prefs);

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
          queryClient.invalidateQueries({ queryKey: ['notifications'] }); // the unread count on the tab
        }
      } catch {
        // Marking as read is best effort; opening the purchase still works.
      }
    }
    if (n.purchaseId) router.push(('/purchase/' + n.purchaseId) as never);
  }

  const header = (
    <View style={{ gap: Spacing.two, paddingBottom: Spacing.three }}>
      <View style={{ gap: Spacing.one }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <ThemedText type="title">{t('rem.title')}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('rem.settings')}
            hitSlop={12}
            onPress={() => router.push('/reminder-settings' as never)}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Icon name="settings" size={24} color={theme.text} />
          </Pressable>
        </View>
        <ThemedText themeColor="textSecondary">{t('rem.subtitle')}</ThemedText>
      </View>

      <PushOffNotice channel={prefs?.channel ?? 'push'} enabled={prefs?.enabled ?? true} />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label={t('rem.filterAll')} selected={!unreadOnly} onPress={() => setUnreadOnly(false)} />
        <Chip label={t('rem.filterUnread')} selected={unreadOnly} onPress={() => setUnreadOnly(true)} />
      </View>
      {notesError && <ThemedText themeColor="errorText">{notesError}</ThemedText>}
      {notesError && <AppButton variant="secondary" title={t('rem.retry')} onPress={loadAll} />}
    </View>
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Wide screens: same readable width as the lists. */}
        <View style={{ maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', flex: 1 }}>
        <SnoozeSheet visible={snoozing !== null} choices={snoozing?.snoozeUntil ?? []} busy={snoozeBusy} onPick={snooze} onClose={() => setSnoozing(null)} />
        <FlatList
          data={groupRows(notes)}
          keyExtractor={(row) => (row.kind === 'header' ? 'h:' + row.label : row.note.id)}
          ListHeaderComponent={header}
          refreshing={loading}
          onRefresh={loadAll}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            loading && notes.length === 0 ? (
              <View style={{ gap: 10 }}>
                <Skeleton style={{ height: 92, borderRadius: Radius.md }} />
                <Skeleton style={{ height: 92, borderRadius: Radius.md }} />
              </View>
            ) : loading ? null : prefs && !prefs.enabled ? (
              <View style={{ gap: 12 }}>
                <EmptyState title={t('rem.emptyOff')} help={t('rem.emptyOffHelp')} icon="bell-off" />
                <AppButton title={t('rem.turnOn')} onPress={() => router.push('/reminder-settings' as never)} />
              </View>
            ) : (
              <EmptyState
                title={unreadOnly ? t('rem.emptyUnread') : t('rem.empty')}
                help={t('rem.emptyHelp')}
                icon={unreadOnly ? 'check-circle' : 'bell'}
              />
            )
          }
          contentContainerStyle={{ paddingHorizontal: Spacing.three, paddingBottom: 120, gap: 10 }}
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={{ marginTop: Spacing.two, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {item.label}
                </ThemedText>
              );
            }
            const note = item.note;
            return (
              <View>
                {/* The card look lives on a plain View; the open-purchase Pressable and the
                    snooze link are siblings, so screen readers reach both. */}
                <ThemedView
                  type="backgroundElement"
                  style={{
                    padding: Spacing.three,
                    borderRadius: Radius.md,
                    gap: Spacing.one,
                    borderStartWidth: note.read ? 0 : Spacing.one,
                    borderStartColor: Brand.primary,
                    ...SoftShadow,
                  }}>
                  <Pressable
                    onPress={() => openNote(note)}
                    accessibilityRole="button"
                    accessibilityLabel={note.title + ', ' + deliveredAt(note.createdAt)}
                    android_ripple={{ color: Brand.primary + '1F' }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, gap: Spacing.one })}>
                    <ThemedText style={{ fontWeight: note.read ? '400' : '700' }}>{note.title}</ThemedText>
                    <ThemedText type="small">{note.body}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {deliveredAt(note.createdAt)}
                    </ThemedText>
                  </Pressable>
                  {note.purchaseId && note.snoozeUntil && note.snoozeUntil.length > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('rem.snooze')}
                      onPress={() => setSnoozing(note)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={({ pressed }) => ({
                        alignSelf: 'flex-start',
                        minHeight: 44,
                        justifyContent: 'center',
                        marginTop: 2,
                        opacity: pressed ? 0.7 : 1,
                      })}>
                      <ThemedText type="linkPrimary">{t('rem.snooze')}</ThemedText>
                    </Pressable>
                  ) : null}
                </ThemedView>
              </View>
            );
          }}
        />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}