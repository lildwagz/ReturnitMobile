import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { currentLanguage, t, tn } from '@/i18n';
import { findCategory } from '@/lib/category';
import { fetchReceiptLink } from '@/lib/use-receipt-file';
import { initialDuration, Purchase, ReceiptItem } from '@/lib/purchase';
import { cachedReceipt, downloadReceipt, receiptExt, receiptKey } from '@/lib/receipt-cache';
import { daysLeft, formatDate, formatIDR, todayLocal, warrantyStatus } from '@/lib/warranty';

export type ClaimOptions = { price: boolean; notes: boolean; photos: boolean };

// A receipt photo ready to sit in the PDF: shrunk and as a data address.
export type ClaimPhoto = { name: string; dataUri: string };

export type ClaimInput = {
  purchase: Purchase;
  options: ClaimOptions;
  photos: ClaimPhoto[];
  // PDF receipts cannot be merged into a PDF, so they are only named.
  separate: string[];
  logo: string | null;
};

// Everything a person typed goes through this before it enters the page.
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const PHOTO_WIDTH = 1400; // pixels; plenty for reading a receipt on paper
const PHOTO_QUALITY = 0.75;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // larger originals are left out (the server allows 10 MB)

const STATUS_COLOR = { active: '#15803D', expiring: '#B45309', expired: '#B91C1C', unknown: '#475569' } as const;

function statusLine(p: Purchase): { text: string; color: string } {
  const status = warrantyStatus(p.warrantyEndDate);
  const left = daysLeft(p.warrantyEndDate);
  if (status === 'unknown' || left === null) return { text: t('claim.pdfUnknown'), color: STATUS_COLOR.unknown };
  if (status === 'expired') {
    return { text: t('claim.pdfEnded', { date: formatDate(p.warrantyEndDate) }), color: STATUS_COLOR.expired };
  }
  return {
    text: t('claim.pdfActive', { date: formatDate(p.warrantyEndDate) }) + ' (' + tn('daysLeft', left) + ')',
    color: STATUS_COLOR[status],
  };
}

// The whole PDF as one HTML page (A4, white, black text). Pure: the same input gives the same page.
export function buildClaimHtml(input: ClaimInput): string {
  const { purchase: p, options, photos, separate, logo } = input;
  const rtl = currentLanguage() === 'ar';
  const status = statusLine(p);
  const months = initialDuration(p);
  const cat = findCategory(p.category);

  const rows: [string, string][] = [
    [t('export.col.product'), p.productName],
    [t('export.col.store'), p.storeName || '-'],
    [t('detail.purchaseDate'), formatDate(p.purchaseDate)],
  ];
  if (options.price && p.price !== null && p.price !== undefined) rows.push([t('detail.price'), formatIDR(p.price, p.currency)]);
  if (cat) rows.push([t('cat.filter'), cat.label()]);
  if (typeof months === 'number') rows.push([t('detail.duration'), tn('months', months)]);
  if (p.warrantyStartDate) rows.push([t('claim.pdfStart'), formatDate(p.warrantyStartDate)]);
  if (p.warrantyEndDate) rows.push([t('detail.endDate'), formatDate(p.warrantyEndDate)]);
  if (p.returnDeadline) rows.push([t('detail.returnDeadline'), formatDate(p.returnDeadline)]);

  const table = rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td dir="auto">${esc(v)}</td></tr>`).join('');
  const notes = options.notes && p.notes ? `<h2>${esc(t('claim.pdfNotes'))}</h2><p class="notes" dir="auto">${esc(p.notes)}</p>` : '';
  const sepList = separate.length
    ? `<ul class="sep">${separate.map((n) => `<li>${esc(t('claim.pdfSeparate', { name: n }))}</li>`).join('')}</ul>`
    : '';
  const pages = photos
    .map(
      (ph, i) =>
        `<section class="photo"><p class="cap">${esc(t('claim.pdfReceiptCaption', { n: i + 1, total: photos.length, name: ph.name }))}</p><img src="${ph.dataUri}" alt=""></section>`,
    )
    .join('');
  const proof = sepList ? `<h2>${esc(t('claim.pdfReceipts'))}</h2>${sepList}` : '';

  return `<!doctype html>
<html lang="${currentLanguage()}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*{box-sizing:border-box}
@page{size:A4;margin:0}
body{margin:0;padding:14mm 16mm 24mm;font-family:Roboto,'Noto Sans','Noto Naskh Arabic',sans-serif;font-size:11pt;line-height:1.5;color:#0F172A;background:#fff}
.head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #2563EB;padding-bottom:10px;margin-bottom:18px}
.head img{height:34px}
.brand{font-size:16pt;font-weight:700;color:#2563EB}
.meta{font-size:9.5pt;color:#334155}
h1{font-size:20pt;line-height:1.2;margin:0 0 4px}
h2{font-size:13pt;color:#2563EB;margin:22px 0 6px}
.status{border:1px solid #CBD5E1;border-inline-start:6px solid var(--c);border-radius:6px;padding:10px 14px;margin:14px 0 4px;font-weight:700;font-size:12.5pt}
.ret{margin:0;padding:0 14px;font-size:10.5pt;color:#334155}
table{width:100%;border-collapse:collapse;margin-top:6px}
th,td{text-align:start;vertical-align:top;padding:7px 8px;border-bottom:1px solid #E2E8F0}
th{width:38%;font-weight:700;color:#334155}
.notes{white-space:pre-wrap;margin:0;overflow-wrap:anywhere}
td{overflow-wrap:anywhere}
.sep{margin:4px 0 0;padding-inline-start:20px}
.photo{break-before:page;page-break-before:always;text-align:center;padding-top:14mm}
.photo .cap{font-size:10pt;color:#334155;margin:0 0 8px;text-align:start;overflow-wrap:anywhere}
.photo img{max-width:100%;max-height:235mm;object-fit:contain;border:1px solid #CBD5E1}
.foot{position:fixed;bottom:8mm;left:16mm;right:16mm;font-size:8.5pt;color:#475569;border-top:1px solid #CBD5E1;padding-top:5px;text-align:center;background:#fff}
</style>
</head>
<body>
<div class="head">
  ${logo ? `<img src="${logo}" alt="ReturnIt">` : '<span class="brand">ReturnIt</span>'}
  <span class="meta">${esc(t('claim.pdfGenerated', { date: formatDate(todayLocal()) }))}</span>
</div>
<h1>${esc(t('claim.pdfTitle'))}</h1>
<div class="status" style="--c:${status.color}">${esc(status.text)}</div>
${p.returnDeadline ? `<p class="ret">${esc(t('claim.pdfReturn', { date: formatDate(p.returnDeadline) }))}</p>` : ''}
<h2>${esc(t('claim.pdfProduct'))}</h2>
<table>${table}</table>
${notes}
${proof}
${pages}
<div class="foot">${esc(t('claim.pdfFooter'))}</div>
</body>
</html>`;
}

let logoCache: string | null | undefined;

// The ReturnIt logo as a data address, or null when it cannot be read (the page then shows the name as text).
async function loadLogo(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const asset = Asset.fromModule(require('@/assets/images/logo-lockup.png'));
    await asset.downloadAsync();
    logoCache = asset.localUri ? 'data:image/png;base64,' + (await new File(asset.localUri).base64()) : null;
  } catch {
    logoCache = null;
  }
  return logoCache;
}

// A receipt image, shrunk, as a data address.
async function toPhoto(localUri: string, name: string): Promise<ClaimPhoto> {
  const r = await ImageManipulator.manipulateAsync(localUri, [{ resize: { width: PHOTO_WIDTH } }], {
    compress: PHOTO_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!r.base64) throw new Error('no image data');
  return { name, dataUri: 'data:image/jpeg;base64,' + r.base64 };
}

async function receiptFile(purchaseId: string, r: ReceiptItem): Promise<string> {
  const key = receiptKey(purchaseId, r);
  const ext = receiptExt(r.contentType);
  return cachedReceipt(key, ext) ?? downloadReceipt(await fetchReceiptLink(purchaseId, r.id), key, ext);
}

export type ClaimResult =
  | { kind: 'ready'; uri: string; skipped: number } // the PDF is made and waits in the cache for the person to look at and share
  | { kind: 'receiptFailed'; index: number; id: string } // 1-based number and id of the receipt that could not be fetched
  | { kind: 'error'; message: string };

// Makes the PDF. `skip` lists receipt ids the person chose to leave out after a failure.
export async function createClaimPackage(
  purchase: Purchase,
  options: ClaimOptions,
  skip: string[],
  onStep: (message: string) => void,
): Promise<ClaimResult> {
  if (!(await Sharing.isAvailableAsync())) return { kind: 'error', message: t('claim.noSharing') };
  const photos: ClaimPhoto[] = [];
  const separate: string[] = [];
  let skipped = 0;
  const receipts = options.photos ? (purchase.receipts ?? []).filter((r) => !skip.includes(r.id)) : [];
  let n = 0;
  for (const r of receipts) {
    n += 1;
    if (r.contentType === 'application/pdf') {
      separate.push(r.fileName);
      continue;
    }
    if (r.sizeBytes > MAX_PHOTO_BYTES) {
      skipped += 1;
      continue;
    }
    onStep(t('claim.stepReceipt', { n, total: receipts.length }));
    try {
      photos.push(await toPhoto(await receiptFile(purchase.id, r), r.fileName));
    } catch {
      return { kind: 'receiptFailed', index: (purchase.receipts ?? []).findIndex((x) => x.id === r.id) + 1, id: r.id };
    }
  }

  onStep(t('claim.stepBuild'));
  const stamp = todayLocal();
  const safeName = purchase.productName.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'produk';
  let pdf: File | null = null;
  try {
    const html = buildClaimHtml({ purchase, options, photos, separate, logo: await loadLogo() });
    const made = await Print.printToFileAsync({ html, width: 595, height: 842 });
    pdf = new File(Paths.cache, `ReturnIt-${safeName}-${stamp}.pdf`);
    if (pdf.exists) pdf.delete();
    await new File(made.uri).move(pdf);
    return { kind: 'ready', uri: pdf.uri, skipped };
  } catch {
    if (pdf) discardClaimPdf(pdf.uri);
    return { kind: 'error', message: t('claim.failed') };
  }
}

// Opens the share sheet for a made PDF. False when the device refused or the sheet failed.
export async function shareClaimPdf(uri: string): Promise<boolean> {
  try {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: t('claim.dialogTitle') });
    return true;
  } catch {
    return false;
  }
}

// The PDF holds personal data: leave no copy in the cache once the person is done with it.
export function discardClaimPdf(uri: string): void {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // nothing to do
  }
}
