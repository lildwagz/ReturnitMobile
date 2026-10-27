import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Switch, View, useColorScheme } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppTextInput } from '@/components/app-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { t, tn, type Key } from '@/i18n';
import { apiFetch } from '@/lib/auth';
import { connectionError, errorMessage } from '@/lib/purchase';
import { PushPermission, getPushPermission, registerForPush } from '@/lib/push';
import { useRefetchStaleOnFocus, useReminderPrefs } from '@/lib/queries';
import { keys, queryClient } from '@/lib/query-client';

export type Prefs = {
  enabled: boolean;
  daysBefore: number[];
  channel: 'push' | 'email' | 'in_app';
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string;
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


// The state in a few words, for the row in Settings: "Aktif · 7, 1 hari sebelumnya · Notifikasi HP".
export function prefsStatus(p: Prefs): string {
  if (!p.enabled || p.daysBefore.length === 0) return t('rem.status.off');
  return t('rem.status.on', {
    days: [...p.daysBefore].sort((a, b) => b - a).join(t('rem.listSep')),
    channel: t(('rem.channel.' + p.channel) as Key),
  });
}

// The notification permission of the phone, re-read every time the screen comes into view (it may have been changed
// in the system settings).
export function usePushPermission() {
  const [perm, setPerm] = useState<{ status: PushPermission; canAskAgain: boolean } | null>(null);
  useFocusEffect(
    useCallback(() => {
      getPushPermission().then(setPerm).catch(() => {});
    }, []),
  );
  return [perm, setPerm] as const;
}

// Shown only when reminders are meant to arrive as phone notifications but the phone does not allow them: it explains
// why nothing arrives.
export function PushOffNotice({ channel, enabled = true }: { channel: Prefs['channel']; enabled?: boolean }) {
  const [perm, setPerm] = usePushPermission();
  if (!enabled || channel !== 'push' || !perm || perm.status === 'granted') return null;
  return (
    <ThemedView type="backgroundElement" style={{ padding: Spacing.three, borderRadius: Radius.sm, gap: Spacing.two }}>
      <ThemedText>{t('rem.pushOff')}</ThemedText>
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
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      android_ripple={{ color: Brand.primary + '1F' }}
      style={({ pressed }) => ({
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        minHeight: 44,
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: selected ? Brand.primary : '#8884',
        opacity: pressed ? 0.85 : 1,
      })}>
      <ThemedText maxFontSizeMultiplier={1.2} type="small" style={{ color: selected ? 'white' : undefined }}>
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

// The reminder settings: on or off, which days, the extra channel, quiet hours, and what it all adds up to.
// Opened from Settings (Preferensi pengingat) and from the button on the Pengingat tab.
export function ReminderPrefs({ signedIn }: { signedIn: boolean }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const prefsQuery = useReminderPrefs<Prefs>(signedIn);
  const [draft, setPrefs] = useState<Prefs | null>(null); // unsaved edits; the saved settings come from the cache
  const prefs = draft ?? prefsQuery.data ?? null;
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const prefsError = prefsQuery.error ? prefsQuery.error.message : null;
  useRefetchStaleOnFocus(keys.prefs);

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

  const timeInput = {
    color: colors.text,
    backgroundColor: colors.backgroundElement,
    borderRadius: Radius.sm,
    padding: Spacing.two,
    fontSize: 16,
    minWidth: 90,
    textAlign: 'center',
  } as const;

  return (
    <View style={{ gap: 10 }}>
      <PushOffNotice channel={prefs?.channel ?? 'push'} enabled={prefs?.enabled ?? true} />

      {prefsError && (
        <>
          <ThemedText themeColor="errorText">{prefsError}</ThemedText>
          <AppButton variant="secondary" title={t('rem.retry')} onPress={() => prefsQuery.refetch()} />
        </>
      )}
      {!prefs && !prefsError && <ActivityIndicator />}
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
              <ThemedText type="small">{t('rem.quietHelp')}</ThemedText>
            </>
          )}

          <ThemedView type="backgroundElement" style={{ padding: Spacing.three, borderRadius: Radius.sm, gap: Spacing.one }}>
            <ThemedText type="small" style={{ fontWeight: 700 }}>
              {t('rem.summaryTitle')}
            </ThemedText>
            <ThemedText type="small">{summarize(prefs)}</ThemedText>
          </ThemedView>

          {saving ? <ActivityIndicator /> : <AppButton title={t('rem.save')} onPress={save} />}
          {saveMsg && <ThemedText type="small">{saveMsg}</ThemedText>}
        </>
      )}
    </View>
  );
}
