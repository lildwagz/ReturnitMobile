import { ReceiptSection } from '@/components/receipt-section';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';

import { PurchaseForm } from '@/components/purchase-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiFetch } from '@/lib/auth';
import { usePurchase } from '@/lib/queries';
import { invalidatePurchases, keys, queryClient } from '@/lib/query-client';
import { showToast } from '@/lib/toast';
import { CONNECTION_ERROR, errorMessage, initialDuration } from '@/lib/purchase';
import { formatDate, formatIDR, warrantyStatus } from '@/lib/warranty';
import { AppButton } from '@/components/app-button';
import { StatusBadge } from '@/components/status-badge';
import { WarrantyBanner } from '@/components/warranty-banner';

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText>{value}</ThemedText>
    </View>
  );
}

// Half-width cell of the two-column detail grid.
function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '50%', paddingRight: 8 }}>
      <Line label={label} value={value} />
    </View>
  );
}

export default function PurchaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const query = usePurchase(id, true);
  const p = query.data ?? null;
  const loading = query.isLoading;
  const error = query.error ? query.error.message : null;
  const load = () => query.refetch();

  async function saveEdit(body: Record<string, unknown>) {
    try {
      const res = await apiFetch('/purchases/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        queryClient.setQueryData(keys.purchase(String(id)), await res.json());
        invalidatePurchases();
        setEditing(false);
        showToast('Pembelian berhasil diperbarui.');
        return null;
      }
      return await errorMessage(res);
    } catch {
      return CONNECTION_ERROR;
    }
  }

  function confirmDelete() {
    Alert.alert('Hapus pembelian?', 'Catatan dan struk terkait akan dihapus permanen.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiFetch('/purchases/' + id, { method: 'DELETE' });
            if (res.status === 204) {
              queryClient.removeQueries({ queryKey: keys.purchase(String(id)) });
              invalidatePurchases();
              showToast('Pembelian dihapus.');
              router.back();
            } else Alert.alert('Gagal menghapus', await errorMessage(res));
          } catch {
            Alert.alert('Gagal menghapus', CONNECTION_ERROR);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error || !p) {
    return (
      <ThemedView style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center' }}>
        <ThemedText>{error ?? 'Catatan tidak ditemukan.'}</ThemedText>
        <AppButton variant="secondary" title="Coba lagi" onPress={load} />
      </ThemedView>
    );
  }

  if (editing) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Pembelian' }} />
        <PurchaseForm initial={p} submitLabel="Simpan perubahan" onCancel={() => setEditing(false)} onSubmit={saveEdit} />
      </>
    );
  }

  const status = warrantyStatus(p.warrantyEndDate);
  const months = initialDuration(p);
  const duration =
    typeof months === 'number' ? months + ' bulan' : months === 'keep' ? 'Kustom' : 'Tidak diketahui';

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 80 }}>
        <View style={{ gap: 6 }}>
          <ThemedText type="title" style={{ fontSize: 24, lineHeight: 30 }}>
            {p.productName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {p.storeName || 'Toko tidak diisi'}
          </ThemedText>
          <StatusBadge status={status} />
        </View>

        <WarrantyBanner status={status} endDate={p.warrantyEndDate} />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
          <Cell label="Tanggal pembelian" value={formatDate(p.purchaseDate)} />
          <Cell label="Durasi garansi" value={duration} />
          <Cell label="Harga" value={formatIDR(p.price, p.currency)} />
          <Cell label="Tanggal akhir garansi" value={formatDate(p.warrantyEndDate)} />
        </View>
        {p.notes ? <Line label="Catatan" value={p.notes} /> : null}

        <ReceiptSection purchaseId={p.id} receipt={p.receipt} onChanged={invalidatePurchases} />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppButton variant="secondary" title="Edit" onPress={() => setEditing(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton title="Hapus" variant="danger" onPress={confirmDelete} />
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}