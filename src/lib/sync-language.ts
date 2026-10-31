import { apiFetch } from '@/lib/auth';
import type { Language } from '@/i18n';

// Tells the server which language the person uses, so reminders (push, e-mail and the inbox) are written in it.
// Called after sign-in and whenever the language changes; the server ignores a repeat. A failure is harmless: the
// next start tries again.
export async function syncLanguage(language: Language): Promise<void> {
  try {
    await apiFetch('/account/language', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    });
  } catch {
    // offline: retried at the next start
  }
}
