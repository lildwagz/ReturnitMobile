import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { PurchaseForm } from '@/components/purchase-form';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { t } from '@/i18n';
import { apiFetch } from '@/lib/auth';
import { connectionError, errorMessage, type Purchase } from '@/lib/purchase';
import { usePurchase } from '@/lib/queries';
import { invalidatePurchases, keys, queryClient } from '@/lib/query-client';
import { hapticSuccess } from '@/lib/haptics';
import { showToast } from '@/lib/toast';

// Editing opens as its own modal route instead of replacing the detail content in place.
// Keeps the same PATCH call and the same cache update as before.
export default function EditPurchase() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = usePurchase(id, true);
  const p = (query.data ?? null) as Purchase | null;
  const error = query.error ? query.error.message : null;

  async function save(body: Record<string, unknown>) {
    try {
      const res = await apiFetch('/purchases/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        queryClient.setQueryData(keys.purchase(String(id)), await res.json());
        invalidatePurchases();
        hapticSuccess(); // the edited record is saved
        showToast(t('detail.updated'));
        router.back();
        return null;
      }
      return await errorMessage(res);
    } catch {
      return connectionError();
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t('detail.editTitle') }} />
      <ThemedView style={{ flex: 1 }}>
        {error || !p ? (
          <View style={{ padding: 24, gap: 16, justifyContent: 'center', flex: 1 }}>
            <ThemedText>{error ?? t('error.notFound')}</ThemedText>
            <AppButton variant="secondary" title={t('detail.retry')} onPress={() => query.refetch()} />
          </View>
        ) : (
          <PurchaseForm
            initial={p}
            submitLabel={t('detail.saveChanges')}
            onCancel={() => router.back()}
            onSubmit={save}
          />
        )}
      </ThemedView>
    </>
  );
}
