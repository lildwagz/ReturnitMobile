import { useRouter } from 'expo-router';

import { PurchaseForm } from '@/components/purchase-form';
import { apiFetch } from '@/lib/auth';
import { CONNECTION_ERROR, errorMessage } from '@/lib/purchase';

export default function NewPurchase() {
  const router = useRouter();

  async function submit(body: Record<string, unknown>) {
    try {
      const res = await apiFetch('/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 201) {
        router.back();
        return null;
      }
      return await errorMessage(res);
    } catch {
      return CONNECTION_ERROR;
    }
  }

  return <PurchaseForm submitLabel="Simpan" onSubmit={submit} />;
}