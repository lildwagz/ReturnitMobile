import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { apiFetch } from '@/lib/auth';
import { CONNECTION_ERROR, Purchase, errorMessage, initialDuration } from '@/lib/purchase';
import { STATUS_LABEL, todayLocal, warrantyStatus } from '@/lib/warranty';

const HEADER = [
  'Produk',
  'Toko',
  'Tanggal Pembelian',
  'Durasi Garansi (bulan)',
  'Tanggal Akhir',
  'Status',
  'Harga',
  'Mata Uang',
  'Catatan',
  'Struk',
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
      STATUS_LABEL[warrantyStatus(p.warrantyEndDate)],
      p.price,
      p.currency,
      p.notes,
      p.receipt?.fileName,
    ].map(cell).join(',');
  });
  // BOM first, so Excel reads the file as UTF-8 (Indonesian text, accents).
  return '﻿' + [HEADER.map(cell).join(','), ...rows].join('\r\n') + '\r\n';
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
    return e instanceof SyntaxError ? 'Data ekspor tidak lengkap. Coba lagi.' : CONNECTION_ERROR;
  }
  if (!Array.isArray(doc.purchases)) return 'Data ekspor tidak lengkap. Coba lagi.';
  if (doc.purchases.length === 0) return 'Belum ada pembelian untuk diekspor.';

  if (!(await Sharing.isAvailableAsync())) return 'Berbagi file tidak tersedia di perangkat ini.';
  const file = new File(Paths.cache, 'returnit-pembelian-' + todayLocal() + '.csv');
  try {
    if (file.exists) file.delete();
    file.create();
    file.write(purchasesToCsv(doc.purchases));
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: 'Ekspor data ReturnIt',
    });
    return null;
  } catch {
    return 'Tidak dapat membuat file ekspor.';
  } finally {
    try {
      if (file.exists) file.delete(); // the data is personal: do not leave a copy in the cache
    } catch {
      // nothing to do
    }
  }
}
