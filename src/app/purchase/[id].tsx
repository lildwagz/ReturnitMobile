import { ReceiptSection } from '@/components/receipt-section';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, ScrollView, View } from 'react-native';

import { PurchaseForm } from '@/components/purchase-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiFetch } from '@/lib/auth';
import { CONNECTION_ERROR, Purchase, errorMessage } from '@/lib/purchase';
import { STATUS_LABEL, daysLeft, formatIDR, warrantyStatus } from '@/lib/warranty';

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <ThemedText type="small">{label}</ThemedText>
      <ThemedText>{value}</ThemedText>
    </View>
  );
}

export default function PurchaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [p, setP] = useState<Purchase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/purchases/' + id);
      if (res.ok) setP(await res.json());
      else setError(await errorMessage(res));
    } catch {
      setError(CONNECTION_ERROR);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveEdit(body: Record<string, unknown>) {
    try {
      const res = await apiFetch('/purchases/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setP(await res.json());
        setEditing(false);
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
            if (res.status === 204) router.back();
            else Alert.alert('Gagal menghapus', await errorMessage(res));
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
        <Button title="Coba lagi" onPress={load} />
      </ThemedView>
    );
  }

  if (editing) {
    return <PurchaseForm initial={p} submitLabel="Simpan perubahan" onSubmit={saveEdit} />;
  }

  const status = warrantyStatus(p.warrantyEndDate);
  const left = daysLeft(p.warrantyEndDate);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 80 }}>
        <ThemedText type="title" style={{ fontSize: 26, lineHeight: 32 }}>
          {p.productName}
        </ThemedText>
        <Line label="Status garansi" value={STATUS_LABEL[status]} />
        {left !== null && (
          <Line
            label="Sisa waktu"
            value={left >= 0 ? left + ' hari lagi' : 'Berakhir ' + -left + ' hari lalu'}
          />
        )}
        <Line label="Tanggal pembelian" value={p.purchaseDate} />
        {p.warrantyEndDate ? <Line label="Garansi berakhir" value={p.warrantyEndDate} /> : null}
        <Line label="Toko" value={p.storeName || '-'} />
        <Line label="Harga" value={formatIDR(p.price, p.currency)} />
        <Line label="Catatan" value={p.notes || '-'} />
        <ReceiptSection purchaseId={p.id} receipt={p.receipt} onChanged={load} />
        <Button title="Edit" onPress={() => setEditing(true)} />
        <Button title="Hapus" color="#C62828" onPress={confirmDelete} />
      </ScrollView>
    </ThemedView>
  );
}