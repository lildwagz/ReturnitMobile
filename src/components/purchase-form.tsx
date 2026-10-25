import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Brand } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DURATIONS, Purchase, RETURN_CHOICES, initialDuration, initialReturnDays, isValidDate } from '@/lib/purchase';
import { addDays, addMonths, formatDate, todayLocal } from '@/lib/warranty';
import { AppButton } from '@/components/app-button';
import { AppTextInput } from '@/components/app-text-input';
import { DateField } from '@/components/date-field';
import { captureReceipt, pickReceipt } from '@/lib/receipt';

type Props = {
  initial?: Purchase;
  submitLabel: string;
  // Shows the optional receipt picker (the "add" screen). The file is uploaded by the caller after the purchase exists.
  withReceipt?: boolean;
  // Called by the "Batal" button.
  onCancel?: () => void;
  // Returns an error message to show, or null when saved.
  onSubmit: (body: Record<string, unknown>, receiptUri?: string) => Promise<string | null>;
};

type Duration = number | null | 'keep';

// One choice of a row of choices (duration, return period).
function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: selected ? Brand.primary : theme.backgroundElement,
      }}>
      <ThemedText type="small" style={{ color: selected ? 'white' : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function PurchaseForm({ initial, submitLabel, withReceipt, onCancel, onSubmit }: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [name, setName] = useState(initial?.productName ?? '');
  const [store, setStore] = useState(initial?.storeName ?? '');
  const [date, setDate] = useState(initial?.purchaseDate ?? todayLocal());
  const [price, setPrice] = useState(
    initial?.price !== null && initial?.price !== undefined ? String(initial.price) : '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [duration, setDuration] = useState<Duration>(initial ? initialDuration(initial) : 12); // new purchases start at 12 months, as in the prototype
  const [returnDays, setReturnDays] = useState<Duration>(initialReturnDays(initial)); // none unless the person sets it
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{ uri: string; name?: string } | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [cameraBlocked, setCameraBlocked] = useState(false);

  async function chooseReceipt(pick: typeof pickReceipt) {
    setReceiptError(null);
    setCameraBlocked(false);
    const r = await pick();
    if (r.error) {
      setReceiptError(r.error);
      setCameraBlocked(!!r.cameraBlocked);
    } else if (r.uri) setReceipt({ uri: r.uri, name: r.name });
  }

  const input = {
    color: colors.text,
    backgroundColor: colors.backgroundElement,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  } as const;

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nama produk wajib diisi.';
    else if (name.trim().length > 160) e.name = 'Nama produk maksimal 160 karakter.';
    if (!isValidDate(date)) e.date = 'Tanggal tidak valid. Gunakan format TTTT-BB-HH, contoh 2026-10-19.';
    if (store.trim().length > 160) e.store = 'Nama toko maksimal 160 karakter.';
    if (price.trim() && !/^\d+(\.\d+)?$/.test(price.trim())) e.price = 'Harga harus berupa angka, tanpa titik ribuan.';
    if (notes.trim().length > 2000) e.notes = 'Catatan maksimal 2000 karakter.';
    return e;
  }

  async function save() {
    const e = validate();
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length > 0) return;

    // Edit replaces the whole record, so every field is sent again.
    const body: Record<string, unknown> = { productName: name.trim(), purchaseDate: date };
    if (store.trim()) body.storeName = store.trim();
    if (price.trim()) body.price = Number(price.trim());
    if (notes.trim()) body.notes = notes.trim();
    if (initial?.currency) body.currency = initial.currency;
    if (typeof duration === 'number') {
      body.warrantyStartDate = date;
      body.warrantyEndDate = addMonths(date, duration);
    } else if (duration === 'keep' && initial?.warrantyEndDate) {
      if (initial.warrantyStartDate) body.warrantyStartDate = initial.warrantyStartDate;
      body.warrantyEndDate = initial.warrantyEndDate;
    }
    if (typeof returnDays === 'number') body.returnDeadline = addDays(date, returnDays);
    else if (returnDays === 'keep' && initial?.returnDeadline) body.returnDeadline = initial.returnDeadline;

    setBusy(true);
    const message = await onSubmit(body, receipt?.uri);
    setBusy(false);
    if (message) setFormError(message);
  }

  const endPreview =
    typeof duration === 'number' && isValidDate(date)
      ? addMonths(date, duration)
      : duration === 'keep'
        ? initial?.warrantyEndDate
        : null;

  const returnPreview =
    typeof returnDays === 'number' && isValidDate(date)
      ? addDays(date, returnDays)
      : returnDays === 'keep'
        ? initial?.returnDeadline
        : null;

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
        {!initial && (
          <ThemedText themeColor="textSecondary">Isi informasi dasar. Struk dapat ditambahkan sekarang atau nanti.</ThemedText>
        )}
        <ThemedText type="small">Nama produk *</ThemedText>
        <AppTextInput style={input} value={name} onChangeText={setName} placeholder="Contoh: Headphone Sony" />
        {errors.name && <ThemedText type="small" themeColor="errorText">{errors.name}</ThemedText>}

        <ThemedText type="small">Toko / Store</ThemedText>
        <AppTextInput style={input} value={store} onChangeText={setStore} placeholder="Contoh: Toko Elektronik" />
        {errors.store && <ThemedText type="small" themeColor="errorText">{errors.store}</ThemedText>}

        <ThemedText type="small">Tanggal pembelian *</ThemedText>
        <DateField value={date} onChange={setDate} />
        {errors.date && <ThemedText type="small" themeColor="errorText">{errors.date}</ThemedText>}

        <ThemedText type="small">Durasi garansi</ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DURATIONS.map((m) => (
            <ChoiceChip key={m} label={m + ' bulan'} selected={duration === m} onPress={() => setDuration(m)} />
          ))}
          {initial && initialDuration(initial) === 'keep' && (
            <ChoiceChip label="Tetap" selected={duration === 'keep'} onPress={() => setDuration('keep')} />
          )}
          <ChoiceChip label="Tidak diketahui" selected={duration === null} onPress={() => setDuration(null)} />
        </View>
        {endPreview ? <ThemedText type="small">Garansi berakhir: {formatDate(endPreview)}</ThemedText> : null}

        <ThemedText type="small">Batas pengembalian (opsional)</ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <ChoiceChip label="Tidak ada" selected={returnDays === null} onPress={() => setReturnDays(null)} />
          {RETURN_CHOICES.map((d) => (
            <ChoiceChip key={d} label={d + ' hari'} selected={returnDays === d} onPress={() => setReturnDays(d)} />
          ))}
          {initial && initialReturnDays(initial) === 'keep' && (
            <ChoiceChip label="Tetap" selected={returnDays === 'keep'} onPress={() => setReturnDays('keep')} />
          )}
        </View>
        {returnPreview ? (
          <ThemedText type="small">Batas pengembalian: {formatDate(returnPreview)}. Anda akan diingatkan 3 dan 1 hari sebelumnya.</ThemedText>
        ) : null}

        <ThemedText type="small">Harga (opsional)</ThemedText>
        <AppTextInput style={input} value={price} onChangeText={setPrice} placeholder="Contoh: 1500000" keyboardType="numeric" />
        {errors.price && <ThemedText type="small" themeColor="errorText">{errors.price}</ThemedText>}

        <ThemedText type="small">Catatan</ThemedText>
        <AppTextInput style={[input, { minHeight: 80, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} multiline placeholder="Opsional" />
        {errors.notes && <ThemedText type="small" themeColor="errorText">{errors.notes}</ThemedText>}

        {withReceipt && (
          <>
            <ThemedText type="small">Struk (opsional, PDF/JPEG/PNG maks. 10 MB)</ThemedText>
            {receipt ? (
              <View style={{ gap: 8 }}>
                <ThemedText>{receipt.name ?? 'File dipilih'}</ThemedText>
                <AppButton variant="secondary" title="Hapus pilihan" onPress={() => setReceipt(null)} disabled={busy} />
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <AppButton variant="secondary" title="Pilih file struk" onPress={() => chooseReceipt(pickReceipt)} disabled={busy} />
                <AppButton variant="secondary" title="Ambil foto struk" onPress={() => chooseReceipt(captureReceipt)} disabled={busy} />
              </View>
            )}
            {cameraBlocked && <AppButton variant="secondary" title="Buka pengaturan aplikasi" onPress={() => Linking.openSettings()} />}
            {receiptError && <ThemedText type="small" themeColor="errorText">{receiptError}</ThemedText>}
          </>
        )}

        {formError && <ThemedText themeColor="errorText">{formError}</ThemedText>}
        {busy ? (
          <ActivityIndicator />
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {onCancel && (
              <View style={{ flex: 1 }}>
                <AppButton variant="secondary" title="Batal" onPress={onCancel} />
              </View>
            )}
            <View style={{ flex: 2 }}>
              <AppButton title={submitLabel} onPress={save} />
            </View>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}