import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect } from 'react';

import { t } from '@/i18n';
import { ALLOWED, MAX_BYTES } from '@/lib/receipt';
import { showToast } from '@/lib/toast';

// A photo or PDF shared to ReturnIt from another app (Share, then ReturnIt) opens the new-purchase form with the file
// attached, the same place the camera and the file picker lead to. Mounted only while signed in, so a file shared
// before login waits and is used right after it. Only one file is taken; a type the server would refuse is turned away here.
export function useSharedReceipt() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent) return;
    const file = shareIntent.files?.[0];
    resetShareIntent();
    if (!file) return; // text or a link: not a receipt
    if (!file.mimeType || !ALLOWED.includes(file.mimeType)) {
      showToast(t('receipt.badType'));
      return;
    }
    if (file.size && file.size > MAX_BYTES) {
      showToast(t('receipt.tooBig'));
      return;
    }
    router.push({
      pathname: '/purchase/new',
      params: { receiptUri: file.path, receiptName: file.fileName ?? '' },
    } as never);
  }, [hasShareIntent, shareIntent, resetShareIntent, router]);
}
