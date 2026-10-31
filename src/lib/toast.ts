// Tiny event bus for short confirmation messages; <ToastHost /> (src/components/toast-host.tsx) shows them.
// With an action the message also has a button (e.g. "Undo") and stays a little longer.
export type ToastAction = { label: string; onPress: () => void; ms?: number };
type Listener = (message: string, action?: ToastAction) => void;
const listeners = new Set<Listener>();

export function showToast(message: string, action?: ToastAction) {
  listeners.forEach((l) => l(message, action));
}

export function subscribeToast(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
