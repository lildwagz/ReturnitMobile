import { ReceiptSection } from '@/components/receipt-section';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';

import { PurchaseForm } from '@/components/purchase-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { t, tn } from '@/i18n';
import { apiFetch } from '@/lib/auth';
import { usePurchase } from '@/lib/queries';
import { forgetReceipt } from '@/lib/receipt-cache';
import { invalidatePurchases, keys, queryClient } from '@/lib/query-client';
import { showToast } from '@/lib/toast';
import { connectionError, errorMessage, initialDuration } from '@/lib/purchase';
import { formatDate, formatIDR, warrantyStatus } from '@/lib/warranty';
import { AppButton } from '@/components/app-button';
import { StatusBadge } from '@/components/status-badge';
import { ReturnBanner, WarrantyBanner } from '@/components/warranty-banner';
import { addDateToCalendar } from '@/lib/calendar';

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
    <View style={{ width: '50%', paddingEnd: 8 }}>
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
        showToast(t('detail.updated'));
        return null;
      }
      return await errorMessage(res);
    } catch {
      return connectionError();
    }
  }

  function confirmDelete() {
    Alert.alert(t('detail.deleteTitle'), t('detail.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('detail.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiFetch('/purchases/' + id, { method: 'DELETE' });
            if (res.status === 204) {
              forgetReceipt(String(id));
              queryClient.removeQueries({ queryKey: keys.purchase(String(id)) });
              invalidatePurchases();
              showToast(t('detail.deleted'));
              router.back();
            } else Alert.alert(t('detail.deleteFailed'), await errorMessage(res));
          } catch {
            Alert.alert(t('detail.deleteFailed'), connectionError());
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
        <ThemedText>{error ?? t('error.notFound')}</ThemedText>
        <AppButton variant="secondary" title={t('detail.retry')} onPress={load} />
      </ThemedView>
    );
  }

  if (editing) {
    return (
      <>
        <Stack.Screen options={{ title: t('detail.editTitle') }} />
        <PurchaseForm initial={p} submitLabel={t('detail.saveChanges')} onCancel={() => setEditing(false)} onSubmit={saveEdit} />
      </>
    );
  }

  async function addToCalendar(title: string, date: string, notes: string) {
    const r = await addDateToCalendar({ title, date, notes });
    if (r === 'saved') showToast(t('detail.calendarAdded'));
    else if (r === 'error') showToast(t('detail.calendarFailed'));
  }

  const status = warrantyStatus(p.warrantyEndDate);
  const months = initialDuration(p);
  const duration =
    typeof months === 'number' ? tn('months', months) : months === 'keep' ? t('detail.custom') : t('common.unknown');

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 80 }}>
        <View style={{ gap: 6 }}>
          <ThemedText type="title" style={{ fontSize: 24, lineHeight: 30 }}>
            {p.productName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {p.storeName || t('detail.noStore')}
          </ThemedText>
          <StatusBadge status={status} />
        </View>

        <WarrantyBanner status={status} endDate={p.warrantyEndDate} />
        {p.returnDeadline ? <ReturnBanner date={p.returnDeadline} /> : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
          <Cell label={t('detail.purchaseDate')} value={formatDate(p.purchaseDate)} />
          <Cell label={t('detail.duration')} value={duration} />
          <Cell label={t('detail.price')} value={formatIDR(p.price, p.currency)} />
          <Cell label={t('detail.endDate')} value={formatDate(p.warrantyEndDate)} />
          {p.returnDeadline ? <Cell label={t('detail.returnDeadline')} value={formatDate(p.returnDeadline)} /> : null}
        </View>
        {p.warrantyEndDate || p.returnDeadline ? (
          <View style={{ gap: 8 }}>
            {p.warrantyEndDate ? (
              <AppButton
                small
                variant="secondary"
                title={t('detail.calWarranty')}
                onPress={() => addToCalendar(t('detail.calWarrantyTitle', { name: p.productName }), p.warrantyEndDate!, t('detail.calNotes'))}
              />
            ) : null}
            {p.returnDeadline ? (
              <AppButton
                small
                variant="secondary"
                title={t('detail.calReturn')}
                onPress={() => addToCalendar(t('detail.calReturnTitle', { name: p.productName }), p.returnDeadline!, t('detail.calNotes'))}
              />
            ) : null}
          </View>
        ) : null}
        {p.notes ? <Line label={t('detail.notes')} value={p.notes} /> : null}

        <ReceiptSection purchaseId={p.id} receipt={p.receipt} onChanged={invalidatePurchases} />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppButton variant="secondary" title={t('detail.edit')} onPress={() => setEditing(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton title={t('detail.delete')} variant="danger" onPress={confirmDelete} />
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}