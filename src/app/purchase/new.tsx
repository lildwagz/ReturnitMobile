import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { PurchaseForm } from '@/components/purchase-form';
import { apiFetch } from '@/lib/auth';
import { CONNECTION_ERROR, errorMessage } from '@/lib/purchase';
import { uploadReceipt } from '@/lib/receipt';

export default function NewPurchase() {
  const router = useRouter();

  async function submit(body: Record<string, unknown>, receiptUri?: string) {
    try {
      const res = await apiFetch('/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status !== 201) return await errorMessage(res);

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
          Alert.alert('Pembelian tersimpan', 'Struk belum terunggah: ' + error + '\nCoba lagi dari halaman ini.');
          router.replace(('/purchase/' + id) as never);
          return null;
        }
      }
      router.back();
      return null;
    } catch {
      return CONNECTION_ERROR;
    }
  }

  return <PurchaseForm submitLabel="Simpan" withReceipt onSubmit={submit} />;
}
