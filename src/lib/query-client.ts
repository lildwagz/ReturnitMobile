import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

// In-memory cache only (never written to disk: purchases and receipts are personal data). Data shown from the
// cache is refreshed in the background once it is older than `staleTime`. It is cleared on sign-out (see auth.ts).
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1 } },
});

// Coming back to the app from the background counts as a "focus", so stale data is refreshed.
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (state) => handleFocus(state === 'active'));
  return () => sub.remove();
});

export const keys = {
  purchases: ['purchases'] as const,
  summary: ['purchases', 'summary'] as const,
  deadlines: ['purchases', 'deadlines'] as const, // under 'purchases': every change to a purchase refreshes it
  purchaseList: (status: string, q: string, category: string, sort: string) => ['purchases', 'list', status, q, category, sort] as const,
  purchaseCount: (status: string) => ['purchases', 'count', status] as const,
  recent: ['purchases', 'recent'] as const,
  purchase: (id: string) => ['purchase', id] as const,
  account: ['account'] as const,
  prefs: ['reminder-prefs'] as const,
  notifications: (unreadOnly: boolean) => ['notifications', unreadOnly] as const,
};

// After any change to a purchase or its receipt: every list, count and detail may be out of date.
export function invalidatePurchases() {
  queryClient.invalidateQueries({ queryKey: keys.purchases });
  queryClient.invalidateQueries({ queryKey: ['purchase'] });
}
