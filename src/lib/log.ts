// The app's log: one line per request to the server (method, path, status, time taken) and a few events such as
// sign-in. Lines go to the console (adb logcat shows them in release builds too) and to a short list kept in memory,
// which Settings can share as a file when something has to be investigated.
//
// What is never written: the access token, passwords, push tokens and receipt links (they are replaced), and file
// uploads. Request and response bodies hold personal data (names, shops, notes, prices), so they are written only
// in a development build or when the build was made with EXPO_PUBLIC_LOG_BODY=true. The list is lost when the app
// closes and is cleared at sign-out.

const MAX_LINES = 300;
const MAX_BODY = 2000;

// Bodies are logged in development, or in a build made for debugging.
export const LOG_BODIES = __DEV__ || process.env.EXPO_PUBLIC_LOG_BODY === 'true';

const SECRET_KEYS = /token|password|secret|authorization|^url$|code_verifier|^code$/i;

const lines: string[] = [];

function push(entry: Record<string, unknown>) {
  const line = JSON.stringify({ t: new Date().toISOString(), ...entry });
  lines.push(line);
  if (lines.length > MAX_LINES) lines.shift();
  console.log('[returnit] ' + line);
}

// JSON text with every secret value replaced, cut to MAX_BODY; anything that is not JSON is not logged.
function scrub(text: string): string | undefined {
  if (!text) return undefined;
  try {
    const clean = JSON.stringify(JSON.parse(text), (k, v) => (SECRET_KEYS.test(k) ? '[hidden]' : v));
    return clean.length > MAX_BODY ? clean.slice(0, MAX_BODY) + '…' : clean;
  } catch {
    return undefined;
  }
}

function requestBody(body: unknown): string | undefined {
  if (!LOG_BODIES || typeof body !== 'string') return undefined;
  return scrub(body);
}

type Fetcher = () => Promise<Response>;

// Runs a request and logs it. `path` is the API path (never the full URL); the response is passed on untouched.
export async function loggedFetch(method: string, path: string, init: RequestInit, send: Fetcher): Promise<Response> {
  const started = Date.now();
  const base = { type: 'http', method, path: path.split('?')[0] };
  const query = path.includes('?') ? path.slice(path.indexOf('?')) : undefined;
  try {
    const res = await send();
    const entry: Record<string, unknown> = { ...base, ...(query && LOG_BODIES ? { query } : {}), status: res.status, ms: Date.now() - started };
    const requestId = res.headers.get('X-Request-ID');
    if (requestId) entry.requestId = requestId;
    if (LOG_BODIES) {
      const req = requestBody(init.body);
      if (req) entry.request = req;
      const type = res.headers.get('Content-Type') ?? '';
      if (type.includes('json') && !base.path.endsWith('/account/export')) {
        try {
          const text = await res.clone().text();
          const body = scrub(text);
          if (body) entry.response = body;
        } catch {
          // the body could not be read twice: the status line is enough
        }
      }
    }
    push(entry);
    return res;
  } catch (e) {
    push({ ...base, error: e instanceof Error ? e.message : String(e), ms: Date.now() - started });
    throw e;
  }
}

// An event that is not a request: sign-in, sign-out, the version check, ... Values must not be personal data.
export function logEvent(name: string, data?: Record<string, unknown>) {
  push({ type: 'event', name, ...data });
}

export function getLogText(): string {
  return lines.join('\n') + '\n';
}

export function logLineCount(): number {
  return lines.length;
}

export function clearLog() {
  lines.length = 0;
}
