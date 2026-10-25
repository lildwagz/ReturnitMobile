import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  Switch,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { PurchaseRow } from '@/components/purchase-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Brand } from '@/constants/theme';
import { t, tn, type Key } from '@/i18n';
import { apiFetch } from '@/lib/auth';
import { connectionError, errorMessage } from '@/lib/purchase';
import { useAttention, useNotifications, useReminderPrefs, useRefetchStaleOnFocus } from '@/lib/queries';
import { keys, queryClient } from '@/lib/query-client';
import { PushPermission, getPushPermission, registerForPush } from '@/lib/push';
import { useSignedIn } from '@/lib/use-signed-in';
import { AppButton } from '@/components/app-button';
import { AppTextInput } from '@/components/app-text-input';
import { SnoozeChoice, SnoozeSheet } from '@/components/snooze-sheet';
import { formatDate } from '@/lib/warranty';
import { showToast } from '@/lib/toast';

type Prefs = {
  enabled: boolean;
  daysBefore: number[];
  channel: 'push' | 'email' | 'in_app';
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string;
};

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

const DAYS = [30, 14, 7, 3, 1];
const CHANNELS: Prefs['channel'][] = ['push', 'email', 'in_app'];
// One sentence that says what the current settings will do (the backend always keeps a copy in the app).
function summarize(p: Prefs): string {
  if (!p.enabled) return t('rem.sum.off');
  if (p.daysBefore.length === 0) return t('rem.sum.noDays');
  const days = [...p.daysBefore].sort((a, b) => b - a).join(t('rem.listSep'));
  const zone = !p.timezone || p.timezone === 'Asia/Jakarta' ? t('rem.zoneWib') : p.timezone;
  const how =
    p.channel === 'push' ? t('rem.sum.viaPush') : p.channel === 'email' ? t('rem.sum.viaEmail') : t('rem.sum.viaApp');
  const quiet =
    p.quietHoursStart && p.quietHoursEnd
      ? t('rem.sum.quiet', { start: p.quietHoursStart, end: p.quietHoursEnd })
      : '';
  return t('rem.sum.main', { days, zone, how, quiet });
}
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: selected ? Brand.primary : '#8884',
      }}>
      <ThemedText type="small" style={{ color: selected ? 'white' : undefined }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

// A setting with a title, one line of help and a switch, as in the prototype.
function PrefRow({ title, help, value, onChange }: { title: string; help: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontWeight: 700 }}>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {help}
        </ThemedText>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={title} />
    </View>
  );
}

export default function RemindersScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { open } = useLocalSearchParams<{ open?: string }>();
  const signedIn = useSignedIn() === true; // the tabs only exist while signed in

  const prefsQuery = useReminderPrefs<Prefs>(signedIn);
  const [draft, setPrefs] = useState<Prefs | null>(null); // unsaved edits; the saved settings come from the cache
  const prefs = draft ?? prefsQuery.data ?? null;
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notesQuery = useNotifications<Note>(unreadOnly, signedIn);
  const notes = notesQuery.data ?? [];
  // Purchases whose warranty ends within 30 days or has ended (what the prototype lists under "perlu diperhatikan").
  const attentionQuery = useAttention(signedIn);
  const attention = attentionQuery.data ?? [];
  const prefsError = prefsQuery.error ? prefsQuery.error.message : null;
  const notesError = notesQuery.error ? notesQuery.error.message : null;
  const loading = prefsQuery.isFetching || notesQuery.isFetching || attentionQuery.isFetching;
  const [perm, setPerm] = useState<{ status: PushPermission; canAskAgain: boolean } | null>(null);
  const handledOpen = useRef<string | null>(null);

  async function loadAll() {
    getPushPermission().then(setPerm).catch(() => {});
    await Promise.all([prefsQuery.refetch(), notesQuery.refetch(), attentionQuery.refetch()]);
  }

  // Coming into view: re-read the notification permission (it may have changed in the system settings) and
  // refresh whatever is older than its staleTime.
  useFocusEffect(
    useCallback(() => {
      getPushPermission().then(setPerm).catch(() => {});
    }, []),
  );
  useRefetchStaleOnFocus(keys.prefs);
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

  function toggleDay(d: number) {
    if (!prefs) return;
    setSaveMsg(null);
    const has = prefs.daysBefore.includes(d);
    setPrefs({ ...prefs, daysBefore: has ? prefs.daysBefore.filter((x) => x !== d) : [...prefs.daysBefore, d] });
  }

  const quietOn = !!(prefs?.quietHoursStart || prefs?.quietHoursEnd);

  async function save() {
    if (!prefs) return;
    setSaveMsg(null);
    if (prefs.enabled && prefs.daysBefore.length === 0) {
      setSaveMsg(t('rem.err.noDay'));
      return;
    }
    if (quietOn && !(HHMM.test(prefs.quietHoursStart ?? '') && HHMM.test(prefs.quietHoursEnd ?? ''))) {
      setSaveMsg(t('rem.err.quiet'));
      return;
    }
    // PUT replaces everything, so every field is sent.
    const body: Record<string, unknown> = {
      enabled: prefs.enabled,
      daysBefore: [...prefs.daysBefore].sort((a, b) => b - a),
      channel: prefs.channel,
      timezone: prefs.timezone ?? 'Asia/Jakarta',
    };
    if (quietOn) {
      body.quietHoursStart = prefs.quietHoursStart;
      body.quietHoursEnd = prefs.quietHoursEnd;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/reminder-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        queryClient.setQueryData(keys.prefs, await res.json());
        setPrefs(null);
        setSaveMsg(t('rem.saved'));
      } else {
        setSaveMsg(await errorMessage(res));
      }
    } catch {
      setSaveMsg(connectionError());
    } finally {
      setSaving(false);
    }
  }

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

  const timeInput = {
    color: colors.text,
    backgroundColor: colors.backgroundElement,
    borderRadius: 12,
    padding: 10,
    fontSize: 16,
    minWidth: 90,
    textAlign: 'center',
  } as const;

  const header = (
    <View style={{ gap: 10, paddingBottom: 12 }}>
      <View style={{ gap: 4 }}>
        <ThemedText type="title">{t('rem.title')}</ThemedText>
        <ThemedText themeColor="textSecondary">{t('rem.subtitle')}</ThemedText>
      </View>

      {perm && perm.status !== 'granted' && (prefs?.channel ?? 'push') === 'push' && (
        <ThemedView type="backgroundElement" style={{ padding: 12, borderRadius: 12, gap: 8 }}>
          <ThemedText>
            {t('rem.pushOff')}
          </ThemedText>
          {perm.canAskAgain ? (
            <AppButton
              title={t('rem.allowPush')}
              onPress={async () => {
                await registerForPush();
                setPerm(await getPushPermission());
              }}
            />
          ) : (
            <AppButton variant="secondary" title={t('rs.openSettings')} onPress={() => Linking.openSettings()} />
          )}
        </ThemedView>
      )}

      {prefsError && <ThemedText themeColor="errorText">{prefsError}</ThemedText>}
      {prefs && (
        <>
          <PrefRow
            title={t('rem.enabledTitle')}
            help={t('rem.enabledHelp')}
            value={prefs.enabled}
            onChange={(v) => {
              setSaveMsg(null);
              setPrefs({ ...prefs, enabled: v });
            }}
          />
          {DAYS.map((d) => (
            <PrefRow
              key={d}
              title={tn('daysBefore', d)}
              help={t(('rem.day' + d) as Key)}
              value={prefs.daysBefore.includes(d)}
              onChange={() => toggleDay(d)}
            />
          ))}

          <ThemedText style={{ fontWeight: 700 }}>{t('rem.alsoVia')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('rem.alsoViaHelp')}
          </ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CHANNELS.map((c) => (
              <Chip
                key={c}
                label={t(('rem.channel.' + c) as Key)}
                selected={prefs.channel === c}
                onPress={() => {
                  setSaveMsg(null);
                  setPrefs({ ...prefs, channel: c });
                }}
              />
            ))}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText>{t('rem.quiet')}</ThemedText>
            <Switch
              value={quietOn}
              onValueChange={(v) => {
                setSaveMsg(null);
                setPrefs({
                  ...prefs,
                  quietHoursStart: v ? '22:00' : null,
                  quietHoursEnd: v ? '07:00' : null,
                });
              }}
            />
          </View>
          {quietOn && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ThemedText type="small">{t('rem.from')}</ThemedText>
                <AppTextInput
                  style={timeInput}
                  value={prefs.quietHoursStart ?? ''}
                  onChangeText={(v) => {
                    setSaveMsg(null);
                    setPrefs({ ...prefs, quietHoursStart: v });
                  }}
                  placeholder="22:00"
                 
                  maxLength={5}
                />
                <ThemedText type="small">{t('rem.to')}</ThemedText>
                <AppTextInput
                  style={timeInput}
                  value={prefs.quietHoursEnd ?? ''}
                  onChangeText={(v) => {
                    setSaveMsg(null);
                    setPrefs({ ...prefs, quietHoursEnd: v });
                  }}
                  placeholder="07:00"
                 
                  maxLength={5}
                />
              </View>
              <ThemedText type="small">
                {t('rem.quietHelp')}
              </ThemedText>
            </>
          )}

          <ThemedView type="backgroundElement" style={{ padding: 12, borderRadius: 12, gap: 4 }}>
            <ThemedText type="small" style={{ fontWeight: 700 }}>
              {t('rem.summaryTitle')}
            </ThemedText>
            <ThemedText type="small">{summarize(prefs)}</ThemedText>
          </ThemedView>

          {saving ? <ActivityIndicator /> : <AppButton title={t('rem.save')} onPress={save} />}
          {saveMsg && <ThemedText type="small">{saveMsg}</ThemedText>}
        </>
      )}

      <ThemedText type="subtitle" style={{ fontSize: 18, lineHeight: 24, marginTop: 12 }}>
        {t('rem.attentionTitle')}
      </ThemedText>
      {attention.length === 0 ? (
        <EmptyState
          title={t('rem.attentionEmpty')}
          help={t('rem.attentionEmptyHelp')}
        />
      ) : (
        attention.map((p) => (
          <PurchaseRow key={p.id} p={p} onPress={() => router.push(('/purchase/' + p.id) as never)} />
        ))
      )}

      <ThemedText type="subtitle" style={{ fontSize: 18, lineHeight: 24, marginTop: 12 }}>
        {t('rem.history')}
      </ThemedText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <ThemedText type="small">{t('rem.unreadOnly')}</ThemedText>
        <Switch value={unreadOnly} onValueChange={setUnreadOnly} />
      </View>
      {notesError && <ThemedText themeColor="errorText">{notesError}</ThemedText>}
      {(prefsError || notesError) && <AppButton variant="secondary" title={t('rem.retry')} onPress={loadAll} />}
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