import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { I18nManager } from 'react-native';

import { dictionary, plurals, type Forms, type Key } from '@/i18n/dictionary';

export type Language = 'id' | 'en' | 'ar';
export type LanguageChoice = Language | 'system';
export type { Key };

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
];

const STORE_KEY = 'rt_lang';

// The phone's language when the person has not chosen one: Indonesian and Arabic are ours, anything else gets English.
function systemLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    if (code === 'id' || code === 'in') return 'id'; // Android reports Indonesian as "in" on some versions
    if (code === 'ar') return 'ar';
  } catch {
    // no locale information: use the app default
    return 'id';
  }
  return 'en';
}

type State = { ready: boolean; choice: LanguageChoice; language: Language; restartNeeded: boolean };
let state: State = { ready: false, choice: 'system', language: 'id', restartNeeded: false };
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useLanguage(): State {
  return useSyncExternalStore(subscribe, () => state);
}

export function currentLanguage(): Language {
  return state.language;
}

export const isRtl = (l: Language = state.language) => l === 'ar';

// Writing direction is decided by the operating system when the app starts: switching between a left-to-right and a
// right-to-left language only takes effect after the app has been closed and opened again.
// I18nManager.isRTL keeps the direction the app started with, so it must not be used to skip forceRTL: the saved
// direction has to follow every choice, or going back to English would stay right-to-left after the restart.
// Returns true when the saved direction differs from the one the app is running with now.
function syncDirection(language: Language): boolean {
  const wantRtl = isRtl(language);
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(wantRtl);
  return I18nManager.isRTL !== wantRtl;
}

// Reads the saved choice (call once at start).
export async function loadLanguage() {
  let choice: LanguageChoice = 'system';
  try {
    const saved = await SecureStore.getItemAsync(STORE_KEY);
    if (saved === 'id' || saved === 'en' || saved === 'ar') choice = saved;
  } catch {
    // keep following the phone
  }
  const language = choice === 'system' ? systemLanguage() : choice;
  set({ ready: true, choice, language, restartNeeded: syncDirection(language) });
}

// Changes the language. Returns true when the writing direction changes, which needs the app to be reopened.
export async function setLanguageChoice(choice: LanguageChoice): Promise<boolean> {
  const language = choice === 'system' ? systemLanguage() : choice;
  try {
    if (choice === 'system') await SecureStore.deleteItemAsync(STORE_KEY);
    else await SecureStore.setItemAsync(STORE_KEY, choice);
  } catch {
    // the choice still applies until the app is closed
  }
  const restartNeeded = syncDirection(language);
  set({ choice, language, restartNeeded });
  return restartNeeded;
}

type Params = Record<string, string | number>;

function fill(text: string, params?: Params): string {
  return params ? text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : text;
}

// A text in the current language; {name} placeholders are filled from params.
export function t(key: Key, params?: Params): string {
  return fill(dictionary[key][state.language], params);
}

// The plural category of a count in a language (CLDR rules for the three languages we have).
export function pluralCategory(language: Language, n: number): 'zero' | 'one' | 'two' | 'few' | 'many' | 'other' {
  if (language === 'en') return n === 1 ? 'one' : 'other';
  if (language === 'ar') {
    const m100 = n % 100;
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (m100 >= 3 && m100 <= 10) return 'few';
    if (m100 >= 11 && m100 <= 99) return 'many';
    return 'other';
  }
  return 'other'; // Indonesian has no plural forms
}

export type PluralKey = keyof typeof plurals;

// A text that depends on a count, e.g. tn('daysLeft', 3) uses the Arabic "few" form. {n} is the count.
export function tn(base: PluralKey, n: number, params?: Params): string {
  const forms: Forms = plurals[base][state.language];
  return fill(forms[pluralCategory(state.language, n)] ?? forms.other, { n, ...params });
}
