import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/auth';
import { connectionError, errorMessage, ReceiptItem } from '@/lib/purchase';
import { cachedReceipt, downloadReceipt, receiptExt, receiptKey } from '@/lib/receipt-cache';

// A fresh short-lived link for one receipt. Kept in memory only, never stored or logged. Throws a message for the user.
export async function fetchReceiptLink(purchaseId: string, id: string): Promise<string> {
  let res: Response;
  try {
    res = await apiFetch('/purchases/' + purchaseId + '/receipts/' + id);
  } catch {
    throw new Error(connectionError());
  }
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()).url as string;
}

// The local file of one receipt: from the on-phone cache when it was seen before, otherwise downloaded through a new
// link. The receipt list (small previews) and the full-screen viewer use the same query key, so a file is fetched once.
export function useReceiptFile(purchaseId: string, receipt: ReceiptItem, enabled = true) {
  const key = receiptKey(purchaseId, receipt);
  const ext = receiptExt(receipt.contentType);
  return useQuery({
    queryKey: ['receipt-file', purchaseId, receipt.id],
    enabled,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () => cachedReceipt(key, ext) ?? downloadReceipt(await fetchReceiptLink(purchaseId, receipt.id), key, ext),
  });
}
