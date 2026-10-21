import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Button, FlatList, Linking, Pressable, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiFetch } from '@/lib/auth';
import { CONNECTION_ERROR, errorMessage } from '@/lib/purchase';
import { PushPermission, getPushPermission, registerForPush } from '@/lib/push';
import { useSignedIn } from '@/lib/use-signed-in';

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

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: selected ? '#208AEF' : '#8884',
      }}>
      <ThemedText type="small" style={{ color: selected ? 'white' : undefined }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function RemindersScreen() {
  const router = useRouter();
  const signedIn = useSignedIn();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [perm, setPerm] = useState<{ status: PushPermission; canAskAgain: boolean } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    getPushPermission().then(setPerm).catch(() => {});
    setPrefsError(null);
    setNotesError(null);
    try {
      const res = await apiFetch('/reminder-preferences');
      if (res.ok) setPrefs(await res.json());
      else setPrefsError(await errorMessage(res));
    } catch {
      setPrefsError(CONNECTION_ERROR);
    }
    try {
      const res = await apiFetch('/notifications?limit=50');
      if (res.ok) setNotes(await res.json());
      else setNotesError(await errorMessage(res));
    } catch {
      setNotesError(CONNECTION_ERROR);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (signedIn) loadAll();
    }, [signedIn, loadAll]),
  );

  function toggleDay(d: number) {
    if (!prefs) return;
    setSaveMsg(null);
    const has = prefs.daysBefore.includes(d);
    setPrefs({ ...prefs, daysBefore: has ? prefs.daysBefore.filter((x) => x !== d) : [...prefs.daysBefore, d] });
  }

  async function save() {
    if (!prefs) return;
    setSaveMsg(null);
    if (prefs.enabled && prefs.daysBefore.length === 0) {
      setSaveMsg('Pilih minimal satu hari, atau matikan pengingat.');
      return;
    }
    // PUT replaces everything, so every field is sent, including the ones this screen does not edit.
    const body: Record<string, unknown> = {
      enabled: prefs.enabled,
      daysBefore: [...prefs.daysBefore].sort((a, b) => b - a),
      channel: prefs.channel,
      timezone: prefs.timezone ?? 'Asia/Jakarta',
    };
    if (prefs.quietHoursStart && prefs.quietHoursEnd) {
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
          <ThemedText>Masuk lewat tab Pembelian untuk melihat pengingat.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

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
            <Button
              title="Izinkan notifikasi"
              onPress={async () => {
                await registerForPush();
                setPerm(await getPushPermission());
              }}
            />
          ) : (
            <Button title="Buka pengaturan aplikasi" onPress={() => Linking.openSettings()} />
          )}
        </ThemedView>
      )}
      {prefsError && <ThemedText style={{ color: '#C62828' }}>{prefsError}</ThemedText>}
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
          {saving ? <ActivityIndicator /> : <Button title="Simpan pengaturan" onPress={save} />}
          {saveMsg && <ThemedText type="small">{saveMsg}</ThemedText>}
        </>
      )}
      <ThemedText type="title" style={{ fontSize: 22, lineHeight: 28, marginTop: 12 }}>
        Garansi yang perlu diperhatikan
      </ThemedText>
      {notesError && <ThemedText style={{ color: '#C62828' }}>{notesError}</ThemedText>}
      {(prefsError || notesError) && <Button title="Coba lagi" onPress={loadAll} />}
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
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={loading ? null : <ThemedText>Belum ada pengingat.</ThemedText>}
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
                  borderLeftColor: '#208AEF',
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