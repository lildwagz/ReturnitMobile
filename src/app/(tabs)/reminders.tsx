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
import { apiFetch } from '@/lib/auth';
import { CONNECTION_ERROR, errorMessage } from '@/lib/purchase';
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
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

const DAYS = [30, 14, 7, 3, 1];
const CHANNELS: { value: Prefs['channel']; label: string }[] = [
  { value: 'push', label: 'Notifikasi HP' },
  { value: 'email', label: 'E-mail' },
  { value: 'in_app', label: 'Hanya di aplikasi' },
];
// One sentence that says what the current settings will do (the backend always keeps a copy in the app).
function summarize(p: Prefs): string {
  if (!p.enabled) return 'Pengingat dimatikan. Tidak ada pengingat yang akan dikirim.';
  if (p.daysBefore.length === 0) return 'Pilih minimal satu hari agar pengingat dikirim.';
  const days = [...p.daysBefore].sort((a, b) => b - a).join(', ');
  const zone = !p.timezone || p.timezone === 'Asia/Jakarta' ? 'WIB' : p.timezone;
  const how =
    p.channel === 'push'
      ? 'lewat notifikasi HP dan di Riwayat pengingat'
      : p.channel === 'email'
        ? 'lewat e-mail dan di Riwayat pengingat'
        : 'hanya di Riwayat pengingat';
  const quiet =
    p.quietHoursStart && p.quietHoursEnd
      ? ` Pengingat yang jatuh pada jam tenang (${p.quietHoursStart}–${p.quietHoursEnd}) dikirim setelah jam tenang selesai.`
      : '';
  return `Anda akan diingatkan ${days} hari sebelum garansi berakhir, pukul 09.00 ${zone}, ${how}.${quiet}`;
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

const DAY_HELP: Record<number, string> = {
  30: 'Pengingat awal untuk memeriksa syarat garansi.',
  14: 'Pengingat lanjutan.',
  7: 'Pengingat lanjutan sebelum masa garansi berakhir.',
  3: 'Pengingat mendekati akhir garansi.',
  1: 'Pengingat terakhir sehari sebelum garansi berakhir.',
};

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
      setSaveMsg('Pilih minimal satu hari, atau matikan pengingat.');
      return;
    }
    if (quietOn && !(HHMM.test(prefs.quietHoursStart ?? '') && HHMM.test(prefs.quietHoursEnd ?? ''))) {
      setSaveMsg('Jam tenang harus berformat JJ:MM, contoh 22:00.');
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
        setSaveMsg('Pengaturan tersimpan.');
      } else {
        setSaveMsg(await errorMessage(res));
      }
    } catch {
      setSaveMsg(CONNECTION_ERROR);
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
        showToast('Diingatkan lagi ' + formatDate(day) + ' pukul ' + time + '.');
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } else if (res.status === 422) {
        showToast('Pengingat ini tidak bisa ditunda lagi (tanggalnya terlalu dekat atau sudah berubah).');
      } else {
        showToast(await errorMessage(res));
      }
    } catch {
      showToast(CONNECTION_ERROR);
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
        <ThemedText type="title">Pengingat Garansi</ThemedText>
        <ThemedText themeColor="textSecondary">Atur kapan ReturnIt mengingatkan Anda.</ThemedText>
      </View>

      {perm && perm.status !== 'granted' && (prefs?.channel ?? 'push') === 'push' && (
        <ThemedView type="backgroundElement" style={{ padding: 12, borderRadius: 12, gap: 8 }}>
          <ThemedText>
            Notifikasi HP dimatikan, jadi pengingat hanya muncul di Riwayat pengingat di bawah dan tidak
            dialihkan ke e-mail.
          </ThemedText>
          {perm.canAskAgain ? (
            <AppButton
              title="Izinkan notifikasi"
              onPress={async () => {
                await registerForPush();
                setPerm(await getPushPermission());
              }}
            />
          ) : (
            <AppButton variant="secondary" title="Buka pengaturan aplikasi" onPress={() => Linking.openSettings()} />
          )}
        </ThemedView>
      )}

      {prefsError && <ThemedText themeColor="errorText">{prefsError}</ThemedText>}
      {prefs && (
        <>
          <PrefRow
            title="Pengingat garansi"
            help="Aktifkan pengingat untuk item dengan tanggal akhir yang diketahui. Dikirim pukul 09:00."
            value={prefs.enabled}
            onChange={(v) => {
              setSaveMsg(null);
              setPrefs({ ...prefs, enabled: v });
            }}
          />
          {DAYS.map((d) => (
            <PrefRow
              key={d}
              title={d + ' hari sebelumnya'}
              help={DAY_HELP[d]}
              value={prefs.daysBefore.includes(d)}
              onChange={() => toggleDay(d)}
            />
          ))}

          <ThemedText style={{ fontWeight: 700 }}>Kirim juga lewat</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Pengingat selalu muncul di Riwayat pengingat di bawah. Pilihan ini menambah satu pesan: notifikasi di HP,
            e-mail ke akun Anda, atau tidak ada. Hanya satu yang bisa dipilih.
          </ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CHANNELS.map((c) => (
              <Chip
                key={c.value}
                label={c.label}
                selected={prefs.channel === c.value}
                onPress={() => {
                  setSaveMsg(null);
                  setPrefs({ ...prefs, channel: c.value });
                }}
              />
            ))}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText>Jam tenang</ThemedText>
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
                <ThemedText type="small">Mulai</ThemedText>
                <AppTextInput
                  style={timeInput}
                  value={prefs.quietHoursStart ?? ''}
                  onChangeText={(t) => {
                    setSaveMsg(null);
                    setPrefs({ ...prefs, quietHoursStart: t });
                  }}
                  placeholder="22:00"
                 
                  maxLength={5}
                />
                <ThemedText type="small">Selesai</ThemedText>
                <AppTextInput
                  style={timeInput}
                  value={prefs.quietHoursEnd ?? ''}
                  onChangeText={(t) => {
                    setSaveMsg(null);
                    setPrefs({ ...prefs, quietHoursEnd: t });
                  }}
                  placeholder="07:00"
                 
                  maxLength={5}
                />
              </View>
              <ThemedText type="small">
                Pengingat yang jatuh pada jam tenang dikirim setelah jam tenang berakhir.
              </ThemedText>
            </>
          )}

          <ThemedView type="backgroundElement" style={{ padding: 12, borderRadius: 12, gap: 4 }}>
            <ThemedText type="small" style={{ fontWeight: 700 }}>
              Ringkasan (berlaku setelah disimpan)
            </ThemedText>
            <ThemedText type="small">{summarize(prefs)}</ThemedText>
          </ThemedView>

          {saving ? <ActivityIndicator /> : <AppButton title="Simpan pengaturan" onPress={save} />}
          {saveMsg && <ThemedText type="small">{saveMsg}</ThemedText>}
        </>
      )}

      <ThemedText type="subtitle" style={{ fontSize: 18, lineHeight: 24, marginTop: 12 }}>
        Garansi yang perlu diperhatikan
      </ThemedText>
      {attention.length === 0 ? (
        <EmptyState
          title="Belum ada garansi mendekati akhir"
          help="Item yang perlu diperhatikan akan tampil di sini."
        />
      ) : (
        attention.map((p) => (
          <PurchaseRow key={p.id} p={p} onPress={() => router.push(('/purchase/' + p.id) as never)} />
        ))
      )}

      <ThemedText type="subtitle" style={{ fontSize: 18, lineHeight: 24, marginTop: 12 }}>
        Riwayat pengingat
      </ThemedText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <ThemedText type="small">Hanya yang belum dibaca</ThemedText>
        <Switch value={unreadOnly} onValueChange={setUnreadOnly} />
      </View>
      {notesError && <ThemedText themeColor="errorText">{notesError}</ThemedText>}
      {(prefsError || notesError) && <AppButton variant="secondary" title="Coba lagi" onPress={loadAll} />}
    </View>
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 16 }}>
        <SnoozeSheet visible={snoozing !== null} busy={snoozeBusy} onPick={snooze} onClose={() => setSnoozing(null)} />
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
                title={unreadOnly ? 'Tidak ada pengingat yang belum dibaca' : 'Belum ada pengingat'}
                help="Pengingat garansi akan tampil di sini saat waktunya tiba."
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
                  borderLeftWidth: item.read ? 0 : 4,
                  borderLeftColor: Brand.primary,
                }}>
                <ThemedText style={{ fontWeight: item.read ? '400' : '700' }}>{item.title}</ThemedText>
                <ThemedText type="small">{item.body}</ThemedText>
                <ThemedText type="small">{new Date(item.createdAt).toLocaleString()}</ThemedText>
                {item.purchaseId ? (
                  <View style={{ alignSelf: 'flex-start', marginTop: 6 }}>
                    <AppButton small variant="secondary" title="Ingatkan lagi" onPress={() => setSnoozing(item)} />
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