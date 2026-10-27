import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, Keyboard, Linking, Pressable, ScrollView, TextInput, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t, tn } from '@/i18n';
import { DURATIONS, Purchase, RETURN_CHOICES, initialDuration, initialReturnDays, isValidDate } from '@/lib/purchase';
import { addDays, addMonths, formatDate, todayLocal } from '@/lib/warranty';
import { AppButton } from '@/components/app-button';
import { AppTextInput, } from '@/components/app-text-input';
import { DateField } from '@/components/date-field';
import { Icon } from '@/components/icon';
import { captureReceipt, pickReceipt } from '@/lib/receipt';

type Props = {
  initial?: Purchase;
  submitLabel: string;
  // Shows the optional receipt picker (the "add" screen). The file is uploaded by the caller after the purchase exists.
  withReceipt?: boolean;
  // A receipt chosen before the form opened (the photo flow from Home).
  initialReceipt?: { uri: string; name?: string };
  // Called by the "Batal" button.
  onCancel?: () => void;
  // Returns an error message to show, or null when saved.
  onSubmit: (body: Record<string, unknown>, receiptUri?: string) => Promise<string | null>;
};

type Duration = number | null | 'keep';

// Order matters: the first key with an error is the one scrolled to and focused.
const FIELD_KEYS = ['name', 'date', 'store', 'price', 'notes'] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

// One choice of a row of choices (duration, return period).
function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      android_ripple={{ color: Brand.primary + '1F' }}
      style={({ pressed }) => ({
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        minHeight: 44,
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: selected ? Brand.primary : theme.backgroundElement,
        opacity: pressed ? 0.85 : 1,
      })}>
      <ThemedText maxFontSizeMultiplier={1.2} type="small" style={{ color: selected ? 'white' : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

// The collapsible "More options" header row: stores, return period, price, notes and receipt
// all move under here so the required fields stay first.
function MoreOptionsRow({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('form.more')}
      accessibilityState={{ expanded: open }}
      onPress={onToggle}
      android_ripple={{ color: theme.primary + '1F' }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        minHeight: 44,
        opacity: pressed ? 0.85 : 1,
      })}>
      <Icon
        name={open ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={theme.textSecondary}
        decorative
      />
      <ThemedText style={{ fontWeight: '700' }}>{t('form.more')}</ThemedText>
    </Pressable>
  );
}

export function PurchaseForm({ initial, submitLabel, withReceipt, initialReceipt, onCancel, onSubmit }: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const fieldY = useRef<Partial<Record<FieldKey, number>>>({});
  const moreY = useRef<number>(0);
  const nameRef = useRef<ComponentRef<typeof TextInput>>(null);
  const storeRef = useRef<ComponentRef<typeof TextInput>>(null);
  const priceRef = useRef<ComponentRef<typeof TextInput>>(null);
  const notesRef = useRef<ComponentRef<typeof TextInput>>(null);

  // More options: open by default on edit when any of the moved fields has a value, and
  // always when a photographed receipt arrived with the form.
  const [moreOpen, setMoreOpen] = useState(
    !!(initial?.storeName || initial?.price || initial?.notes || initial?.returnDeadline || initialReceipt),
  );

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
  const [receipt, setReceipt] = useState<{ uri: string; name?: string } | null>(initialReceipt ?? null);
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

  function trackField(key: FieldKey) {
    return (y: number) => {
      fieldY.current[key] = y;
    };
  }

  // Scrolls to the first field with an error and focuses it when it is a text input.
  // Fields hidden inside the collapsed "More options" block are revealed first; their
  // position is the block's offset plus the field's offset inside it.
  function revealError(e: Record<string, string>) {
    const first = FIELD_KEYS.find((k) => e[k]);
    if (!first) return;
    if (['store', 'price', 'notes'].includes(first)) setMoreOpen(true);
    requestAnimationFrame(() => {
      const inMore = ['store', 'price', 'notes'].includes(first);
      const y = inMore ? moreY.current + (fieldY.current[first] ?? 0) : fieldY.current[first];
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
      (first === 'name' ? nameRef : first === 'store' ? storeRef : first === 'price' ? priceRef : notesRef).current?.focus();
    });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('form.err.nameRequired');
    else if (name.trim().length > 160) e.name = t('form.err.nameLong');
    if (!isValidDate(date)) e.date = t('form.err.date');
    if (store.trim().length > 160) e.store = t('form.err.storeLong');
    if (price.trim() && !/^\d+(\.\d+)?$/.test(price.trim())) e.price = t('form.err.price');
    if (notes.trim().length > 2000) e.notes = t('form.err.notesLong');
    return e;
  }

  async function save() {
    const e = validate();
    setErrors(e);
    setFormError(null);
    // the keyboard must not cover the row being focused
    Keyboard.dismiss();
    if (Object.keys(e).length > 0) {
      revealError(e);
      return;
    }

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
    if (message) {
      setFormError(message);
      scrollRef.current?.scrollToEnd({ animated: true });
    }
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
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: Spacing.three }}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never">
        {!initial && <ThemedText themeColor="textSecondary">{t('form.intro')}</ThemedText>}

        {/* Required fields first: name, purchase date, warranty duration. */}
        <View onLayout={(e) => trackField('name')(e.nativeEvent.layout.y)}>
          <ThemedText type="small">{t('form.name')}</ThemedText>
          <AppTextInput inputRef={nameRef} style={input} value={name} onChangeText={setName} placeholder={t('form.namePlaceholder')} />
          {errors.name && <ThemedText type="small" themeColor="errorText">{errors.name}</ThemedText>}
        </View>

        <View onLayout={(e) => trackField('date')(e.nativeEvent.layout.y)}>
          <ThemedText type="small">{t('form.purchaseDate')}</ThemedText>
          <DateField value={date} onChange={setDate} />
          {errors.date && <ThemedText type="small" themeColor="errorText">{errors.date}</ThemedText>}
        </View>

        <View>
          <ThemedText type="small">{t('form.duration')}</ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DURATIONS.map((m) => (
              <ChoiceChip key={m} label={tn('months', m)} selected={duration === m} onPress={() => setDuration(m)} />
            ))}
            {initial && initialDuration(initial) === 'keep' && (
              <ChoiceChip label={t('form.keep')} selected={duration === 'keep'} onPress={() => setDuration('keep')} />
            )}
            <ChoiceChip label={t('form.unknown')} selected={duration === null} onPress={() => setDuration(null)} />
          </View>
          {endPreview ? <ThemedText type="small">{t('form.warrantyEnds', { date: formatDate(endPreview) })}</ThemedText> : null}
        </View>

        <MoreOptionsRow open={moreOpen} onToggle={() => setMoreOpen((v) => !v)} />

        {moreOpen && (
          <View onLayout={(e) => (moreY.current = e.nativeEvent.layout.y)} style={{ gap: 8 }}>
            <View onLayout={(e) => trackField('store')(e.nativeEvent.layout.y)}>
              <ThemedText type="small">{t('form.store')}</ThemedText>
              <AppTextInput inputRef={storeRef} style={input} value={store} onChangeText={setStore} placeholder={t('form.storePlaceholder')} />
              {errors.store && <ThemedText type="small" themeColor="errorText">{errors.store}</ThemedText>}
            </View>

            <View>
              <ThemedText type="small">{t('form.returnPeriod')}</ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <ChoiceChip label={t('form.none')} selected={returnDays === null} onPress={() => setReturnDays(null)} />
                {RETURN_CHOICES.map((d) => (
                  <ChoiceChip key={d} label={tn('days', d)} selected={returnDays === d} onPress={() => setReturnDays(d)} />
                ))}
                {initial && initialReturnDays(initial) === 'keep' && (
                  <ChoiceChip label={t('form.keep')} selected={returnDays === 'keep'} onPress={() => setReturnDays('keep')} />
                )}
              </View>
              {returnPreview ? (
                <ThemedText type="small">{t('form.returnPreview', { date: formatDate(returnPreview) })}</ThemedText>
              ) : null}
            </View>

            <View onLayout={(e) => trackField('price')(e.nativeEvent.layout.y)}>
              <ThemedText type="small">{t('form.price')}</ThemedText>
              <AppTextInput inputRef={priceRef} style={input} value={price} onChangeText={setPrice} placeholder={t('form.pricePlaceholder')} keyboardType="numeric" />
              {errors.price && <ThemedText type="small" themeColor="errorText">{errors.price}</ThemedText>}
            </View>

            <View onLayout={(e) => trackField('notes')(e.nativeEvent.layout.y)}>
              <ThemedText type="small">{t('form.notes')}</ThemedText>
              <AppTextInput
                inputRef={notesRef}
                style={[input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder={t('form.optional')}
              />
              {errors.notes && <ThemedText type="small" themeColor="errorText">{errors.notes}</ThemedText>}
            </View>

            {withReceipt && (
              <>
                <ThemedText type="small">{t('form.receiptLabel')}</ThemedText>
                {receipt ? (
                  <View style={{ gap: 8 }}>
                    <ThemedText>{receipt.name ?? t('form.fileChosen')}</ThemedText>
                    <AppButton variant="secondary" title={t('form.clearChoice')} onPress={() => setReceipt(null)} disabled={busy} />
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    <AppButton variant="secondary" title={t('form.pickFile')} onPress={() => chooseReceipt(pickReceipt)} disabled={busy} />
                    <AppButton variant="secondary" title={t('form.takeReceiptPhoto')} onPress={() => chooseReceipt(captureReceipt)} disabled={busy} />
                  </View>
                )}
                {cameraBlocked && <AppButton variant="secondary" title={t('rs.openSettings')} onPress={() => Linking.openSettings()} />}
                {receiptError && <ThemedText type="small" themeColor="errorText">{receiptError}</ThemedText>}
              </>
            )}
          </View>
        )}

        {formError && <ThemedText themeColor="errorText">{formError}</ThemedText>}
        {busy && <ActivityIndicator />}
      </ScrollView>

      {/* Sticky Save/Cancel below the scroll, clear of the keyboard and the bottom inset. */}
      {busy ? null : (
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: Spacing.two,
            paddingBottom: insets.bottom + Spacing.two,
            gap: Spacing.two,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            flexDirection: 'row',
          }}>
          {onCancel && (
            <View style={{ flex: 1 }}>
              <AppButton variant="secondary" title={t('common.cancel')} onPress={onCancel} />
            </View>
          )}
          <View style={{ flex: 2 }}>
            <AppButton title={submitLabel} onPress={save} />
          </View>
        </View>
      )}
    </ThemedView>
  );
}
