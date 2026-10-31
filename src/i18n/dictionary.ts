import { category } from '@/i18n/dict/category';
import { deadlines } from '@/i18n/dict/deadlines';
import { common } from '@/i18n/dict/common';
import { components } from '@/i18n/dict/components';
import { detail } from '@/i18n/dict/detail';
import { errors } from '@/i18n/dict/errors';
import { exportDict } from '@/i18n/dict/export';
import { form } from '@/i18n/dict/form';
import { lib } from '@/i18n/dict/lib';
import { pluralTexts } from '@/i18n/dict/plurals';
import { receiptDict } from '@/i18n/dict/receipt';
import { reminders } from '@/i18n/dict/reminders';
import { settings } from '@/i18n/dict/settings';
import { tabs } from '@/i18n/dict/tabs';

type Entry = { id: string; en: string; ar: string };

// The forms of a text that depends on a count. Indonesian only needs "other"; English "one"/"other"; Arabic all six.
export type Forms = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };

// Every text of the app, one entry per key with its three languages. Areas live in src/i18n/dict/*.ts.
// Arabic texts were written without a native reviewer: have them checked before release.
export const dictionary = { ...common, ...errors, ...exportDict, ...lib, ...components, ...receiptDict, ...form, ...detail, ...tabs, ...reminders, ...settings, ...category, ...deadlines } satisfies Record<string, Entry>;

export const plurals: Record<keyof typeof pluralTexts, { id: Forms; en: Forms; ar: Forms }> = pluralTexts;

export type Key = keyof typeof dictionary;
