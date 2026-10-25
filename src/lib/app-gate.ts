import Constants from 'expo-constants';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

// What the server says about this build of the app ("force update" and maintenance). The server decides with the
// version it is sent; the app only obeys. Nothing here may stop the app unless the server said so.
export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';
export const APP_PLATFORM: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';

export type Gate = {
  status: 'ok' | 'update_available' | 'update_required' | 'maintenance';
  message?: string;
  downloadUrl?: string;
  latestVersion?: string;
  minVersion?: string;
};

let gate: Gate = { status: 'ok' };
const listeners = new Set<() => void>();

export function getGate(): Gate {
  return gate;
}

export function setGate(next: Gate) {
  if (JSON.stringify(next) === JSON.stringify(gate)) return;
  gate = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useAppGate(): Gate {
  return useSyncExternalStore(subscribe, getGate);
}

// The invitation to update (not the lock) is shown once per version until the app is closed.
let dismissedFor: string | null = null;
export function dismissUpdateInvite(version: string | undefined) {
  dismissedFor = version ?? null;
  listeners.forEach((l) => l());
}
export function isInviteDismissed(version: string | undefined): boolean {
  return !!version && dismissedFor === version;
}

// An API answer that says "update required" (426) or "maintenance" (503) locks the app even if the start-up check was
// missed. Anything else is ignored.
export async function noteGateFromResponse(res: Response) {
  if (res.status !== 426 && res.status !== 503) return;
  try {
    const err = (await res.clone().json())?.error;
    if (err?.code === 'app_update_required') {
      setGate({
        status: 'update_required',
        message: err.message,
        downloadUrl: err.downloadUrl || undefined,
        minVersion: err.minVersion || undefined,
      });
    } else if (err?.code === 'maintenance') {
      setGate({ status: 'maintenance', message: err.message });
    }
  } catch {
    // not our JSON: some other 503 (for example a proxy), leave the app alone
  }
}
