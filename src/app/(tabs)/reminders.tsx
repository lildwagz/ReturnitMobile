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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Brand } from '@/constants/theme';
import { apiFetch } from '@/lib/auth';
import { CONNECTION_ERROR, errorMessage } from '@/lib/purchase';
import { PushPermission, getPushPermission, registerForPush } from '@/lib/push';
import { useSignedIn } from '@/lib/use-signed-in';
import { AppButton } from '@/components/app-button';
import { AppTextInput } from '@/components/app-text-input';

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
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

const DAYS = [30, 14, 7, 3, 1];
const CHANNELS: { value: Prefs['channel']; label: string }[] = [
  { value: 'push', label: 'Push' },
  { value: 'email', label: 'Email' },
  { value: 'in_app', label: 'Dalam aplikasi' },
];
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

export default function RemindersScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { open } = useLocalSearchParams<{ open?: string }>();
  const signedIn = useSignedIn();

  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [perm, setPerm] = useState<{ status: PushPermission; canAskAgain: boolean } | null>(null);
  const handledOpen = useRef<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setPrefsError(null);
    setNotesError(null);
    getPushPermission().then(setPerm).catch(() => {});
    try {
      const res = await apiFetch('/reminder-preferences');
      if (res.ok) setPrefs(await res.json());
      else setPrefsError(await errorMessage(res));
    } catch {
      setPrefsError(CONNECTION_ERROR);
    }
    try {
      const res = await apiFetch('/notifications?limit=50' + (unreadOnly ? '&unreadOnly=true' : ''));
      if (res.ok) setNotes(await res.json());
      else setNotesError(await errorMessage(res));
    } catch {
      setNotesError(CONNECTION_ERROR);
    }
    setLoading(false);
  }, [unreadOnly]);

  // Runs when the tab comes into view, and again when the unread-only switch changes.
  useFocusEffect(
    useCallback(() => {
      if (signedIn) loadAll();
    }, [signedIn, loadAll]),
  );

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
        setPrefs(await res.json());
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

  async function openNote(n: Note) {
    if (!n.read) {
      try {
        const res = await apiFetch('/notifications/' + n.id + '/read', { method: 'POST' });
        if (res.status === 204) setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      } catch {
        // Marking as read is best effort; opening the purchase still works.
      }
    }
    if (n.purchaseId) router.push(('/purchase/' + n.purchaseId) as never);
  }

  if (signedIn === null) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!signedIn) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          <ThemedText>Masuk lewat tab Home untuk melihat pengingat.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
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
      <ThemedText type="title">Pengingat</ThemedText>

      {perm && perm.status !== 'granted' && (
        <ThemedView type="backgroundElement" style={{ padding: 12, borderRadius: 12, gap: 8 }}>
          <ThemedText>
            Notifikasi dimatikan, jadi pengingat tidak muncul sebagai pesan di layar. Pengingat tetap
            tersimpan di daftar di bawah.
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText>Aktifkan pengingat garansi</ThemedText>
            <Switch
              value={prefs.enabled}
              onValueChange={(v) => {
                setSaveMsg(null);
                setPrefs({ ...prefs, enabled: v });
              }}
            />
          </View>
          <ThemedText type="small">Ingatkan berapa hari sebelum garansi berakhir (pukul 09:00)</ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DAYS.map((d) => (
              <Chip key={d} label={d + ' hari'} selected={prefs.daysBefore.includes(d)} onPress={() => toggleDay(d)} />
            ))}
          </View>

          <ThemedText type="small">Saluran pengingat</ThemedText>
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

          {saving ? <ActivityIndicator /> : <AppButton title="Simpan pengaturan" onPress={save} />}
          {saveMsg && <ThemedText type="small">{saveMsg}</ThemedText>}
        </>
      )}

      <ThemedText type="title" style={{ fontSize: 22, lineHeight: 28, marginTop: 12 }}>
        Garansi yang perlu diperhatikan
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
              </ThemedView>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}