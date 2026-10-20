import { Stack } from 'expo-router';

export default function PurchaseLayout() {
  return (
    <Stack>
      <Stack.Screen name="new" options={{ title: 'Tambah Pembelian' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detail Pembelian' }} />
    </Stack>
  );
}