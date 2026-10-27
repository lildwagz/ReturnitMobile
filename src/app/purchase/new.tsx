import { useRouter, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { PurchaseForm } from '@/components/purchase-form';
import { t } from '@/i18n';
import { apiFetch } from '@/lib/auth';
import { connectionError, errorMessage } from '@/lib/purchase';
import { uploadReceipt } from '@/lib/receipt';
import { hapticSuccess } from '@/lib/haptics';
import { invalidatePurchases } from '@/lib/query-client';
import { showToast } from '@/lib/toast';

export default function NewPurchase() {
  const router = useRouter();
  // Session params: a receipt photographed on Home ("Foto struk"); the form starts with it attached.
  const { receiptUri, receiptName } = useLocalSearchParams<{ receiptUri?: string; receiptName?: string }>();
  const initialReceipt = receiptUri ? { uri: receiptUri, name: receiptName || undefined } : undefined;

  async function submit(body: Record<string, unknown>, receiptUri?: string) {
    try {
      const res = await apiFetch('/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status !== 201) return await errorMessage(res);
      hapticSuccess(); // the purchase is saved: the tick comes before the receipt upload attempt

      // The purchase now exists. A failed receipt upload must not look like a failed save: open the
      // purchase, where "Unggah struk" can be tried again.
      if (receiptUri) {
        let id: string | undefined;
        try {
          id = (await res.json()).id;
        } catch {
          // no id: fall through to the plain "saved" path
        }
        const error = id ? await uploadReceipt(id, receiptUri) : null;
        if (error && id) {
          invalidatePurchases();
          Alert.alert(t('new.savedTitle'), t('new.receiptFailed', { error }));
          router.replace(('/purchase/' + id) as never);
          return null;
        }
      }
      invalidatePurchases();
      showToast(t('new.saved'));
      router.back();
      return null;
    } catch {
      return connectionError();
    }
  }

  return <PurchaseForm submitLabel={t('new.submit')} withReceipt initialReceipt={initialReceipt} onCancel={() => router.back()} onSubmit={submit} />;
}
