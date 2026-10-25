import { APP_PLATFORM, APP_VERSION, Gate, setGate } from '@/lib/app-gate';
import { API } from '@/lib/auth';

// Asks the server what this version of the app must do (GET /app-config, no login needed). Called when the app opens
// and when it comes back to the foreground. If the server cannot be reached nothing changes: being offline must
// never lock anyone out (the API itself refuses outdated versions with 426).
export async function checkAppConfig(): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(
      `${API}/app-config?platform=${APP_PLATFORM}&version=${encodeURIComponent(APP_VERSION)}`,
      { signal: ctrl.signal },
    );
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
  } catch {
    // offline or slow: keep going
  } finally {
    clearTimeout(timer);
  }
}
