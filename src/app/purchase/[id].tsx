import { ReceiptSection } from '@/components/receipt-section';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon } from '@/components/icon';
import { t, tn } from '@/i18n';
import { usePurchase } from '@/lib/queries';
import { deletePurchaseWithConfirm } from '@/lib/delete-purchase';
import { invalidatePurchases } from '@/lib/query-client';
import { showToast } from '@/lib/toast';
import { findCategory } from '@/lib/category';
import { initialDuration } from '@/lib/purchase';
import { formatDate, formatIDR, warrantyStatus } from '@/lib/warranty';
import { AppButton } from '@/components/app-button';
import { StatusBadge } from '@/components/status-badge';
import { ReturnBanner, WarrantyBanner } from '@/components/warranty-banner';
import { addDateToCalendar } from '@/lib/calendar';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

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

// The "..." header menu as a bottom sheet: opens editing (its own modal route) and delete
// (still confirmed by the shared delete flow).
function DetailMenuSheet({ visible, onClose, onEdit, onDelete }: { visible: boolean; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const theme = useTheme();
  const rows: { icon: 'edit-3' | 'trash-2'; title: string; danger?: boolean; onPress: () => void }[] = [
    { icon: 'edit-3', title: t('detail.edit'), onPress: onEdit },
    { icon: 'trash-2', title: t('detail.delete'), danger: true, onPress: onDelete },
  ];
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('detail.actions')}>
      {rows.map((r) => (
        <Pressable
          key={r.icon}
          accessibilityRole="button"
          accessibilityLabel={r.title}
          onPress={r.onPress}
          android_ripple={{ color: r.danger ? theme.errorText + '1F' : theme.primary + '1F' }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.three,
            minHeight: 56,
            padding: Spacing.three,
            borderRadius: Radius.sm,
            backgroundColor: theme.backgroundElement,
            opacity: pressed ? 0.85 : 1,
          })}>
          <Icon name={r.icon} size={20} color={r.danger ? theme.errorText : theme.textSecondary} decorative />
          <ThemedText style={{ fontWeight: '700', color: r.danger ? theme.errorText : theme.text }}>{r.title}</ThemedText>
        </Pressable>
      ))}
    </BottomSheet>
  );
}

export default function PurchaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const query = usePurchase(id, true);
  const p = query.data ?? null;
  const loading = query.isLoading;
  const error = query.error ? query.error.message : null;
  const load = () => query.refetch();

  function confirmDelete() {
    setMenuOpen(false);
    deletePurchaseWithConfirm(String(id), () => router.back());
  }

  function openEdit() {
    setMenuOpen(false);
    router.push({ pathname: '/purchase/edit', params: { id } } as never);
  }

  async function addToCalendar(title: string, date: string, notes: string) {
    const r = await addDateToCalendar({ title, date, notes });
    if (r === 'saved') showToast(t('detail.calendarAdded'));
    else if (r === 'error') showToast(t('detail.calendarFailed'));
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

  const status = warrantyStatus(p.warrantyEndDate);
  const months = initialDuration(p);
  const duration =
    typeof months === 'number' ? tn('months', months) : months === 'keep' ? t('detail.custom') : t('common.unknown');

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: t('purchaseLayout.detail'),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('detail.actions')}
              onPress={() => setMenuOpen(true)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                minWidth: 44,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
                marginEnd: -12,
              })}>
              <Icon name="more-vertical" size={20} color={theme.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 80 }}>
        <View style={{ gap: 6 }}>
          <ThemedText type="title" style={{ fontSize: 24, lineHeight: 30 }}>
            {p.productName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {p.storeName || t('detail.noStore')}
          </ThemedText>
          <View style={{ alignSelf: 'flex-start' }}>
            <StatusBadge status={status} />
          </View>
        </View>

        <WarrantyBanner
          status={status}
          endDate={p.warrantyEndDate}
          onCalendar={p.warrantyEndDate ? () => addToCalendar(t('detail.calWarrantyTitle', { name: p.productName }), p.warrantyEndDate!, t('detail.calNotes')) : undefined}
        />
        {p.returnDeadline ? (
          <ReturnBanner
            date={p.returnDeadline}
            onCalendar={() => addToCalendar(t('detail.calReturnTitle', { name: p.productName }), p.returnDeadline!, t('detail.calNotes'))}
          />
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
          <Cell label={t('detail.purchaseDate')} value={formatDate(p.purchaseDate)} />
          {findCategory(p.category) ? <Cell label={t('cat.filter')} value={findCategory(p.category)!.label()} /> : null}
          <Cell label={t('detail.duration')} value={duration} />
          <Cell label={t('detail.price')} value={formatIDR(p.price, p.currency)} />
          <Cell label={t('detail.endDate')} value={formatDate(p.warrantyEndDate)} />
          {p.returnDeadline ? <Cell label={t('detail.returnDeadline')} value={formatDate(p.returnDeadline)} /> : null}
        </View>
        {p.notes ? <Line label={t('detail.notes')} value={p.notes} /> : null}

        <ReceiptSection purchaseId={p.id} receipts={p.receipts ?? []} onChanged={invalidatePurchases} />
      </ScrollView>

      <DetailMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} onEdit={openEdit} onDelete={confirmDelete} />
    </ThemedView>
  );
}
