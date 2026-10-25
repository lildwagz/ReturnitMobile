// Tiny event bus for short confirmation messages; <ToastHost /> (src/components/toast-host.tsx) shows them.
type Listener = (message: string) => void;
const listeners = new Set<Listener>();

export function showToast(message: string) {
  listeners.forEach((l) => l(message));
}

export function subscribeToast(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
