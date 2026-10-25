import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { t } from '@/i18n';
import { apiFetch } from '@/lib/auth';
import { connectionError, Purchase, errorMessage, initialDuration } from '@/lib/purchase';
import { statusLabel, todayLocal, warrantyStatus } from '@/lib/warranty';

const header = () => [
  t('export.col.product'),
  t('export.col.store'),
  t('export.col.purchaseDate'),
  t('export.col.duration'),
  t('export.col.endDate'),
  t('export.col.status'),
  t('export.col.price'),
  t('export.col.currency'),
  t('export.col.notes'),
  t('export.col.receipt'),
];

// One CSV cell. Text that starts with = + - @ (or a tab / carriage return) would be run as a formula by a
// spreadsheet, so it gets a leading apostrophe; quotes are doubled.
function cell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

export function purchasesToCsv(purchases: Purchase[]): string {
  const rows = purchases.map((p) => {
    const months = initialDuration(p);
    return [
      p.productName,
      p.storeName,
      p.purchaseDate,
      typeof months === 'number' ? months : '',
      p.warrantyEndDate,
      statusLabel(warrantyStatus(p.warrantyEndDate)),
      p.price,
      p.currency,
      p.notes,
      p.receipt?.fileName,
    ].map(cell).join(',');
  });
  // BOM first, so Excel reads the file as UTF-8 (Indonesian text, accents).
  return '﻿' + [header().map(cell).join(','), ...rows].join('\r\n') + '\r\n';
}

// Downloads the user's data (GET /account/export), turns the purchases into a CSV file and opens the share sheet.
// Returns null when done, or a message for the user. The temporary file is deleted afterwards.
export async function exportPurchasesCsv(): Promise<string | null> {
  let doc: { purchases?: Purchase[] };
  try {
    const res = await apiFetch('/account/export');
    if (!res.ok) return await errorMessage(res);
    // The server leaves the document unterminated if it fails mid-stream, so it must parse completely.
    doc = JSON.parse(await res.text());
  } catch (e) {
    return e instanceof SyntaxError ? t('export.incomplete') : connectionError();
  }
  if (!Array.isArray(doc.purchases)) return t('export.incomplete');
  if (doc.purchases.length === 0) return t('export.empty');

  if (!(await Sharing.isAvailableAsync())) return t('export.noSharing');
  const file = new File(Paths.cache, 'returnit-pembelian-' + todayLocal() + '.csv');
  try {
    if (file.exists) file.delete();
    file.create();
    file.write(purchasesToCsv(doc.purchases));
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: t('export.dialogTitle'),
    });
    return null;
  } catch {
    return t('export.cannotCreate');
  } finally {
    try {
      if (file.exists) file.delete(); // the data is personal: do not leave a copy in the cache
    } catch {
      // nothing to do
    }
  }
}
