import { Alert } from 'react-native';

import { t } from '@/i18n';
import { hapticWarning } from '@/lib/haptics';
import { apiFetch } from '@/lib/auth';
import { connectionError, errorMessage } from '@/lib/purchase';
import { forgetReceipt } from '@/lib/receipt-cache';
import { invalidatePurchases, keys, queryClient } from '@/lib/query-client';
import { showToast } from '@/lib/toast';

/**
 * The one delete flow: the same confirmation Alert as the detail screen, then DELETE,
 * receipt cache clean-up, query cache clean-up, list invalidation and the "deleted" toast.
 * `onDone` runs after a successful delete (the detail screen navigates back).
 * There is no undo: the server deletes for good.
 */
export function deletePurchaseWithConfirm(id: string, onDone?: () => void) {
  Alert.alert(t('detail.deleteTitle'), t('detail.deleteBody'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('detail.delete'),
      style: 'destructive',
      onPress: async () => {
        hapticWarning(); // confirmed right now: buzz before the request starts
        try {
          const res = await apiFetch('/purchases/' + id, { method: 'DELETE' });
          if (res.status === 204) {
            forgetReceipt(id);
            queryClient.removeQueries({ queryKey: keys.purchase(id) });
            invalidatePurchases();
            showToast(t('detail.deleted'));
            onDone?.();
          } else Alert.alert(t('detail.deleteFailed'), await errorMessage(res));
        } catch {
          Alert.alert(t('detail.deleteFailed'), connectionError());
        }
      },
    },
  ]);
}
