import { Directory, File, Paths } from 'expo-file-system';

// Receipt files viewed on this phone, kept in the app's private cache folder so that opening a purchase again shows
// the image or PDF at once, without asking the server for a new link (links change every time and last only about
// five minutes, so a cache keyed by the link could never hit). The folder is emptied on sign-out (see auth.ts).
const folder = () => new Directory(Paths.cache, 'receipts');

const safe = (s: string) => s.replace(/[^A-Za-z0-9-]/g, '_');

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

type ReceiptInfo = { fileName: string; contentType: string; sizeBytes: number };

// Same purchase, name, type and size means the same file. Replacing the receipt normally changes one of them, and
// forgetReceipt() is called whenever this app changes a receipt.
export function receiptKey(purchaseId: string, r: ReceiptInfo): string {
  return `${safe(purchaseId)}-${r.sizeBytes}-${hash(r.fileName + '|' + r.contentType)}`;
}

export function receiptExt(contentType: string): string {
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType === 'image/png') return 'png';
  return 'jpg';
}

// The local file of a cached receipt, or null.
export function cachedReceipt(key: string, ext: string): string | null {
  try {
    const f = new File(folder(), `${key}.${ext}`);
    return f.exists ? f.uri : null;
  } catch {
    return null;
  }
}

// Downloads a receipt from its short-lived link into the cache and returns the local file.
export async function downloadReceipt(url: string, key: string, ext: string): Promise<string> {
  const dir = folder();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const target = new File(dir, `${key}.${ext}`);
  try {
    if (target.exists) target.delete();
    return (await File.downloadFileAsync(url, target)).uri;
  } catch (e) {
    try {
      if (target.exists) target.delete(); // never keep a half-downloaded file
    } catch {
      // nothing to do
    }
    throw e;
  }
}

// Drops every cached file of one purchase (its receipt was replaced or removed, or the purchase was deleted).
export function forgetReceipt(purchaseId: string) {
  try {
    const dir = folder();
    if (!dir.exists) return;
    const prefix = safe(purchaseId) + '-';
    for (const item of dir.list()) if (item.name.startsWith(prefix)) item.delete();
  } catch {
    // the cache is only a convenience
  }
}

export function clearReceiptCache() {
  try {
    const dir = folder();
    if (dir.exists) dir.delete();
  } catch {
    // the cache is only a convenience
  }
}
