import { Stack } from 'expo-router';

import { t } from '@/i18n';

export default function PurchaseLayout() {
  return (
    <Stack>
      <Stack.Screen name="new" options={{ title: t('purchaseLayout.add') }} />
      <Stack.Screen name="[id]" options={{ title: t('purchaseLayout.detail') }} />
      <Stack.Screen name="edit" options={{ title: t('detail.editTitle'), presentation: 'modal' }} />
    </Stack>
  );
}