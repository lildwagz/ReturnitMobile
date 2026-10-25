import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { queryClient } from '@/lib/query-client';
import { clearReceiptCache } from '@/lib/receipt-cache';

WebBrowser.maybeCompleteAuthSession();

// Release builds (preview/production) talk to the deployed server; a dev build uses localhost
// unless EXPO_PUBLIC_USE_PROD=true is set when starting Metro.
const USE_PROD = process.env.EXPO_PUBLIC_USE_PROD === 'true' || !__DEV__;
export const ISSUER = USE_PROD
  ? 'https://auth.20-255-48-53.sslip.io/realms/returnit'
  : 'http://localhost:8180/realms/returnit';
export const API = USE_PROD
  ? 'https://api.20-255-48-53.sslip.io/api/v1'
  : 'http://localhost:8080/api/v1';

// export const ISSUER = 'http://localhost:8180/realms/returnit';
// export const API = 'http://localhost:8080/api/v1';

const CLIENT_ID = 'returnit-app';
const REDIRECT = 'com.returnit.app:/oauth2redirect';

const K_ACCESS = 'rt_access';
const K_REFRESH = 'rt_refresh';
const K_EXPIRES = 'rt_expires';

// Screens subscribe here so they update after login/logout, even if rebuilt.
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
export function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

async function saveTokens(t: AuthSession.TokenResponse) {
  await SecureStore.setItemAsync(K_ACCESS, t.accessToken);
  if (t.refreshToken) await SecureStore.setItemAsync(K_REFRESH, t.refreshToken);
  const seconds = t.expiresIn ?? 300;
  await SecureStore.setItemAsync(K_EXPIRES, String(Date.now() + seconds * 1000));
}

async function clearTokens() {
  await SecureStore.deleteItemAsync(K_ACCESS);
  await SecureStore.deleteItemAsync(K_REFRESH);
  await SecureStore.deleteItemAsync(K_EXPIRES);
}

let refreshing: Promise<string | null> | null = null;

async function refreshTokens(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(K_REFRESH);
      if (!refreshToken) return null;
      const discovery = await AuthSession.fetchDiscoveryAsync(ISSUER);
      const t = await AuthSession.refreshAsync({ clientId: CLIENT_ID, refreshToken }, discovery);
      await saveTokens(t);
      return t.accessToken;
    } catch {
      await clearTokens();
      queryClient.clear(); // the session is over: nothing of this user may stay in memory
      clearReceiptCache();
      notify();
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

// Returns a valid access token, refreshing silently if it is about to expire.
export async function getAccessToken(): Promise<string | null> {
  const access = await SecureStore.getItemAsync(K_ACCESS);
  const expires = Number(await SecureStore.getItemAsync(K_EXPIRES)) || 0;
  if (access && expires > Date.now() + 30000) return access;
  return refreshTokens();
}

// Calls the API with the token. Retries once after a refresh if the server says 401.
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = (token: string) =>
    fetch(API + path, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: 'Bearer ' + token },
    });
  const token = await getAccessToken();
  if (!token) throw new Error('Not logged in');
  let res = await send(token);
  if (res.status === 401) {
    const fresh = await refreshTokens();
    if (fresh) res = await send(fresh);
  }
  return res;
}

// Returns null on success, or a message to show the user.
// `provider: 'google'` skips the Keycloak login page and goes straight to Google (kc_idp_hint). A person who has
// no account yet is registered automatically from the Google account, so there is no separate "register with Google".
let loginInFlight = false; // two overlapping logins would answer each other's state and be rejected

export async function login(fresh = false, register = false, provider?: 'google'): Promise<string | null> {
  if (loginInFlight) return null;
  loginInFlight = true;
  try {
    const discovery = await AuthSession.fetchDiscoveryAsync(ISSUER);
    const request = new AuthSession.AuthRequest({
      clientId: CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: REDIRECT,
      usePKCE: true,
      prompt: fresh ? AuthSession.Prompt.Login : undefined,
      extraParams: { ...(fresh ? { max_age: '0' } : {}), ...(provider ? { kc_idp_hint: provider } : {}) },
    });
    const entry = register
      ? { ...discovery, authorizationEndpoint: ISSUER + '/protocol/openid-connect/registrations' }
      : discovery;
    const result = await request.promptAsync(entry);
    // Closing the browser is not an error; anything else tells the user what the login server said.
    if (result.type === 'cancel' || result.type === 'dismiss') return null;
    if (result.type === 'error') {
      // The browser finished an older login (for example a reset-password link opened later), so its answer does
      // not belong to this attempt.
      if (result.error?.code === 'state_mismatch' || /Cross-Site request/i.test(result.error?.message ?? '')) {
        return 'Sesi masuk sebelumnya sudah kedaluwarsa. Tutup tab browser yang masih terbuka, lalu tekan Masuk sekali lagi.';
      }
      const why = result.params?.error_description || result.params?.error || result.error?.message;
      if (provider === 'google') {
        // An e-mail that already has an account made another way cannot be linked silently (a safety rule of the
        // login server), so tell the person what to do instead of showing a bare error.
        return (
          'Tidak dapat masuk dengan Google' +
          (why ? ' (' + why + ')' : '') +
          '. Jika e-mail ini sudah punya akun dengan kata sandi, masuk dengan e-mail dan kata sandi, atau pilih Lupa kata sandi di halaman masuk.'
        );
      }
      return 'Masuk gagal' + (why ? ': ' + why : '. Coba lagi, atau hubungi dukungan bila berulang.');
    }
    if (result.type !== 'success') return 'Masuk gagal (' + result.type + ').';
    const tokens = await AuthSession.exchangeCodeAsync(
      {
        clientId: CLIENT_ID,
        code: result.params.code,
        redirectUri: REDIRECT,
        extraParams: { code_verifier: request.codeVerifier ?? '' },
      },
      discovery,
    );
    await saveTokens(tokens);
    notify();
    return null;
  } catch (e) {
    return 'Error: ' + String(e);
  } finally {
    loginInFlight = false;
  }
}

export async function logout() {
  try {
    const deviceId = await SecureStore.getItemAsync('rt_device_id');
    if (deviceId) {
      await apiFetch('/devices/' + deviceId, { method: 'DELETE' });
      await SecureStore.deleteItemAsync('rt_device_id');
    }
  } catch {
    // Best effort: sign-out continues even if this fails.
  }
  try {
    const refreshToken = await SecureStore.getItemAsync(K_REFRESH);
    if (refreshToken) {
      const discovery = await AuthSession.fetchDiscoveryAsync(ISSUER);
      await AuthSession.revokeAsync({ clientId: CLIENT_ID, token: refreshToken }, discovery);
    }
  } catch {
    // Revoking is best effort; we still forget the tokens below.
  }
  await clearTokens();
  queryClient.clear();
  clearReceiptCache();
  notify();
}