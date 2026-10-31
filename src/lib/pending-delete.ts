import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Alert, AppState } from 'react-native';

import { t } from '@/i18n';
import { apiFetch } from '@/lib/auth';
import { hapticWarning } from '@/lib/haptics';
import { connectionError, errorMessage } from '@/lib/purchase';
import { forgetReceipt } from '@/lib/receipt-cache';
import { invalidatePurchases, keys, queryClient } from '@/lib/query-client';
import { showToast } from '@/lib/toast';

// Swipe-to-delete with Undo. The row disappears at once and a message with "Undo" shows for UNDO_MS; the real DELETE is
// sent only after that (or at once when the app goes to the background, so nothing is lost by leaving). The server
// deletes for good, so Undo is only possible before the request is sent.
const UNDO_MS = 5000;
// A screen reader needs longer to find and activate the button.
const UNDO_MS_SCREEN_READER = 12000;

const timers = new Map<string, ReturnType<typeof setTimeout>>();
let hidden: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

function setHidden(next: Set<string>) {
  hidden = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Ids waiting for their delete: lists leave them out. */
export function usePendingDeletes(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => hidden);
}

function release(id: string) {
  const next = new Set(hidden);
  next.delete(id);
  setHidden(next);
}

async function commit(id: string) {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  try {
    const res = await apiFetch('/purchases/' + id, { method: 'DELETE' });
    if (res.status === 204 || res.status === 404) {
      forgetReceipt(id);
      queryClient.removeQueries({ queryKey: keys.purchase(id) });
      invalidatePurchases();
      release(id);
    } else {
      release(id); // it is still there: show it again
      Alert.alert(t('detail.deleteFailed'), await errorMessage(res));
    }
  } catch {
    release(id);
    Alert.alert(t('detail.deleteFailed'), connectionError());
  }
}

function undo(id: string) {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  release(id);
}

export async function deleteWithUndo(id: string) {
  if (timers.has(id)) return;
  hapticWarning();
  const ms = (await AccessibilityInfo.isScreenReaderEnabled().catch(() => false)) ? UNDO_MS_SCREEN_READER : UNDO_MS;
  if (timers.has(id)) return;
  setHidden(new Set(hidden).add(id));
  timers.set(
    id,
    setTimeout(() => commit(id), ms),
  );
  showToast(t('detail.deleted'), { label: t('common.undo'), onPress: () => undo(id), ms });
}

// Leaving the app sends what is waiting.
AppState.addEventListener('change', (state) => {
  if (state !== 'active') [...timers.keys()].forEach((id) => commit(id));
});
