import { t } from '@/i18n';
import { addMonths, daysBetween } from '@/lib/warranty';

// One receipt file of a purchase (a purchase holds up to MAX_RECEIPTS in lib/receipt.ts).
export type ReceiptItem = { id: string; fileName: string; contentType: string; sizeBytes: number; uploadedAt?: string };

export type Purchase = {
  id: string;
  productName: string;
  storeName?: string | null;
  purchaseDate: string;
  price?: number | null;
  currency?: string;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  // The last day the shop takes the product back (optional).
  returnDeadline?: string | null;
  // One of the keys in lib/category.ts, or null/absent when none (older purchases).
  category?: string | null;
  notes?: string | null;
  // The oldest receipt (older servers send only this); `receipts` lists them all, oldest first.
  receipt?: { fileName: string; contentType: string; sizeBytes: number } | null;
  receipts?: ReceiptItem[];
};

export const DURATIONS = [3, 6, 12, 24, 36];

// Return periods offered in the form, in days after the purchase date.
export const RETURN_CHOICES = [7, 14, 30];

// Which return choice matches an existing record: a number of days, null (no deadline) or 'keep' (a custom date).
export function initialReturnDays(p?: Purchase): number | null | 'keep' {
  if (!p || !p.returnDeadline) return null;
  const days = daysBetween(p.purchaseDate, p.returnDeadline);
  return RETURN_CHOICES.includes(days) ? days : 'keep';
}

export const connectionError = () => t('error.connection');

// A real calendar date in YYYY-MM-DD form (rejects 2026-02-30 and similar).
export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Which duration chip matches an existing record: a number of months, null
// (unknown) or 'keep' (custom dates that no chip reproduces).
export function initialDuration(p?: Purchase): number | null | 'keep' {
  if (!p || !p.warrantyEndDate) return null;
  const base = p.warrantyStartDate ?? p.purchaseDate;
  for (const m of DURATIONS) {
    if (addMonths(base, m) === p.warrantyEndDate) return m;
  }
  return 'keep';
}

// Turns an error response into a message for the user.
export async function errorMessage(res: Response): Promise<string> {
  if (res.status === 429) {
    const wait = res.headers.get('Retry-After');
    return wait ? t('error.tooManyWait', { s: wait }) : t('error.tooMany');
  }
  if (res.status === 404) return t('error.notFound');
  if (res.status === 409) return t('error.account');
  try {
    const data = await res.json();
    if (data?.error?.message) return t('error.failed', { message: data.error.message });
  } catch {
    // body was not JSON
  }
  return t('error.generic', { code: res.status });
}
