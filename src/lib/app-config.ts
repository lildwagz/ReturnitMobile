import { APP_PLATFORM, APP_VERSION, Gate, setGate } from '@/lib/app-gate';
import { API } from '@/lib/auth';
import { loggedFetch, logEvent } from '@/lib/log';

// Asks the server what this version of the app must do (GET /app-config, no login needed). Called when the app opens
// and when it comes back to the foreground. If the server cannot be reached nothing changes: being offline must
// never lock anyone out (the API itself refuses outdated versions with 426).
export async function checkAppConfig(): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const query = `?platform=${APP_PLATFORM}&version=${encodeURIComponent(APP_VERSION)}`;
    const init = { signal: ctrl.signal };
    const res = await loggedFetch('GET', '/app-config' + query, init, () => fetch(`${API}/app-config${query}`, init));
    if (!res.ok) return;
    const j = await res.json();
    if (!['ok', 'update_available', 'update_required', 'maintenance'].includes(j?.status)) return;
    const gate: Gate = {
      status: j.status,
      message: j.message || undefined,
      downloadUrl: j.downloadUrl || undefined,
      latestVersion: j.latestVersion || undefined,
      minVersion: j.minVersion || undefined,
    };
    setGate(gate);
    if (gate.status !== 'ok') logEvent('app_gate', { status: gate.status, latest: gate.latestVersion, min: gate.minVersion });
  } catch {
    // offline or slow: keep going (the failed request is already in the log)
  } finally {
    clearTimeout(timer);
  }
}
