import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

// App lock: when it is on, opening the app (or coming back after GRACE_MS) asks for the phone's fingerprint, face or
// screen-lock PIN. It keeps a casual onlooker out of someone's receipts; it is not a defence against an attacker who
// knows the phone's PIN, and it does not hide the app in the recent-apps list.
const KEY = 'rt_applock';
export const GRACE_MS = 30_000; // leaving the app for less than this does not lock it again

type State = {
  ready: boolean; // the saved setting has been read
  enabled: boolean;
  locked: boolean;
};

// Until the saved setting is known the app counts as locked, so nothing flashes on screen first.
let state: State = { ready: false, enabled: false, locked: true };
const listeners = new Set<() => void>();
let authenticating = false; // a system prompt is open: its own comings and goings must not re-lock the app

function set(next: Partial<State>) {
  const merged = { ...state, ...next };
  if (merged.ready === state.ready && merged.enabled === state.enabled && merged.locked === state.locked) return;
  state = merged;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useAppLock(): State {
  return useSyncExternalStore(subscribe, () => state);
}

export async function loadAppLock() {
  try {
    const on = (await SecureStore.getItemAsync(KEY)) === '1';
    set({ ready: true, enabled: on, locked: on });
  } catch {
    // The saved setting cannot be read: do not lock the person out of their own app.
    set({ ready: true, enabled: false, locked: false });
  }
}

async function authenticate(prompt: string): Promise<{ ok: boolean; error?: string }> {
  authenticating = true;
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      cancelLabel: 'Batal',
      // Fall back to the phone's PIN, pattern or password, so a failing sensor never shuts the owner out.
      disableDeviceFallback: false,
    });
    return r.success ? { ok: true } : { ok: false, error: r.error };
  } catch {
    return { ok: false, error: 'unknown' };
  } finally {
    authenticating = false;
  }
}

// Whether this phone can protect the app: it needs a screen lock (PIN, pattern, password) or a fingerprint or face.
export async function appLockAvailable(): Promise<boolean> {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) return false;
    return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

// Turns the lock on or off. Both ask for the fingerprint, face or PIN first: turning it on proves it works on this
// phone, and turning it off must not be possible for whoever picked up an unlocked phone. Returns a message on failure.
export async function setAppLockEnabled(on: boolean): Promise<string | null> {
  if (on && !(await appLockAvailable())) {
    return 'Atur kunci layar (PIN, pola, atau sidik jari) di pengaturan HP dulu, lalu coba lagi.';
  }
  const r = await authenticate(on ? 'Konfirmasi untuk mengaktifkan kunci aplikasi' : 'Konfirmasi untuk mematikan kunci aplikasi');
  if (!r.ok) {
    return r.error === 'user_cancel' || r.error === 'system_cancel' || r.error === 'app_cancel'
      ? null // the person changed their mind: nothing to report
      : 'Tidak dapat memastikan identitas Anda, jadi pengaturan tidak diubah.';
  }
  try {
    if (on) await SecureStore.setItemAsync(KEY, '1');
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    return 'Pengaturan tidak dapat disimpan.';
  }
  set({ enabled: on, locked: false });
  return null;
}

// Asks for the fingerprint, face or PIN. True when the app was unlocked.
export async function unlockApp(): Promise<{ ok: boolean; error?: string }> {
  const r = await authenticate('Buka ReturnIt');
  if (r.ok) set({ locked: false });
  return r;
}

// Called when the app comes back to the foreground; leftAt is when it went to the background.
export function lockAfterAbsence(leftAt: number | null, now = Date.now()) {
  if (authenticating || leftAt === null || !state.enabled) return;
  if (now - leftAt > GRACE_MS) set({ locked: true });
}
