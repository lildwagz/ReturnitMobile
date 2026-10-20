import { useState } from 'react';
import { ActivityIndicator, Button, Pressable, ScrollView, TextInput, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { DURATIONS, Purchase, initialDuration, isValidDate } from '@/lib/purchase';
import { addMonths, todayLocal } from '@/lib/warranty';

type Props = {
  initial?: Purchase;
  submitLabel: string;
  // Returns an error message to show, or null when saved.
  onSubmit: (body: Record<string, unknown>) => Promise<string | null>;
};

type Duration = number | null | 'keep';

export function PurchaseForm({ initial, submitLabel, onSubmit }: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [name, setName] = useState(initial?.productName ?? '');
  const [store, setStore] = useState(initial?.storeName ?? '');
  const [date, setDate] = useState(initial?.purchaseDate ?? todayLocal());
  const [price, setPrice] = useState(
    initial?.price !== null && initial?.price !== undefined ? String(initial.price) : '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [duration, setDuration] = useState<Duration>(initialDuration(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

    setBusy(true);
    const message = await onSubmit(body);
    setBusy(false);
    if (message) setFormError(message);
  }

  function Chip({ label, value }: { label: string; value: Duration }) {
    const selected = duration === value;
    return (
      <Pressable
        onPress={() => setDuration(value)}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 16,
          backgroundColor: selected ? '#208AEF' : colors.backgroundElement,
        }}>
        <ThemedText type="small" style={{ color: selected ? 'white' : colors.text }}>
          {label}
        </ThemedText>
      </Pressable>
    );
  }

  const endPreview =
    typeof duration === 'number' && isValidDate(date)
      ? addMonths(date, duration)
      : duration === 'keep'
        ? initial?.warrantyEndDate
        : null;

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
        <ThemedText type="small">Nama produk *</ThemedText>
        <TextInput style={input} value={name} onChangeText={setName} placeholder="Contoh: Laptop" placeholderTextColor="#888" />
        {errors.name && <ThemedText type="small" style={{ color: '#C62828' }}>{errors.name}</ThemedText>}

        <ThemedText type="small">Toko</ThemedText>
        <TextInput style={input} value={store} onChangeText={setStore} placeholder="Opsional" placeholderTextColor="#888" />
        {errors.store && <ThemedText type="small" style={{ color: '#C62828' }}>{errors.store}</ThemedText>}

        <ThemedText type="small">Tanggal pembelian * (TTTT-BB-HH)</ThemedText>
        <TextInput style={input} value={date} onChangeText={setDate} placeholder="2026-10-19" placeholderTextColor="#888" autoCapitalize="none" />
        {errors.date && <ThemedText type="small" style={{ color: '#C62828' }}>{errors.date}</ThemedText>}

        <ThemedText type="small">Durasi garansi</ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DURATIONS.map((m) => (
            <Chip key={m} label={m + ' bulan'} value={m} />
          ))}
          {initial && initialDuration(initial) === 'keep' && <Chip label="Tetap" value="keep" />}
          <Chip label="Tidak diketahui" value={null} />
        </View>
        {endPreview ? <ThemedText type="small">Garansi berakhir: {endPreview}</ThemedText> : null}

        <ThemedText type="small">Harga (Rp)</ThemedText>
        <TextInput style={input} value={price} onChangeText={setPrice} placeholder="Opsional, contoh 1500000" placeholderTextColor="#888" keyboardType="numeric" />
        {errors.price && <ThemedText type="small" style={{ color: '#C62828' }}>{errors.price}</ThemedText>}

        <ThemedText type="small">Catatan</ThemedText>
        <TextInput style={[input, { minHeight: 80, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} multiline placeholder="Opsional" placeholderTextColor="#888" />
        {errors.notes && <ThemedText type="small" style={{ color: '#C62828' }}>{errors.notes}</ThemedText>}

        {formError && <ThemedText style={{ color: '#C62828' }}>{formError}</ThemedText>}
        {busy ? <ActivityIndicator /> : <Button title={submitLabel} onPress={save} />}
      </ScrollView>
    </ThemedView>
  );
}