import { Stack } from 'expo-router';

import { t } from '@/i18n';

export default function BucketsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('bk.title') }} />
      <Stack.Screen name="[id]" options={{ title: t('bk.title') }} />
    </Stack>
  );
}
