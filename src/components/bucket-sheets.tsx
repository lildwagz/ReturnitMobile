import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppTextInput } from '@/components/app-text-input';
import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { t } from '@/i18n';

// A sheet with one text field and one button: used to create a bucket and to rename one. `onSubmit` returns an error
// message to show, or null when it worked (the caller then closes the sheet).
export function NameSheet({
  visible,
  title,
  help,
  initial,
  actionTitle,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  title: string;
  help?: string;
  initial: string;
  actionTitle: string;
  onSubmit: (name: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const problem = await onSubmit(name.trim());
    setBusy(false);
    if (problem) setError(problem);
  }

  return (
    <BottomSheet visible={visible} onClose={busy ? () => {} : onClose} title={title}>
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="small">{t('bk.nameLabel')}</ThemedText>
        <AppTextInput value={name} onChangeText={setName} maxLength={60} autoFocus returnKeyType="done" onSubmitEditing={submit} />
        {help ? (
          <ThemedText type="small" themeColor="textSecondary">
            {help}
          </ThemedText>
        ) : null}
        {error && (
          <ThemedText accessibilityLiveRegion="polite" type="small" themeColor="errorText">
            {error}
          </ThemedText>
        )}
        {busy ? <ActivityIndicator /> : <AppButton title={actionTitle} onPress={submit} disabled={name.trim().length === 0} />}
      </View>
    </BottomSheet>
  );
}

// Deleting a bucket removes its purchases for everybody, so the person types its name; the button stays off until it matches.
export function DeleteBucketSheet({
  visible,
  name,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  name: string;
  onConfirm: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const problem = await onConfirm();
    setBusy(false);
    if (problem) setError(problem);
  }

  return (
    <BottomSheet visible={visible} onClose={busy ? () => {} : onClose} title={t('bk.deleteTitle', { name })}>
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('bk.deleteBody')}
        </ThemedText>
        <ThemedText type="small">{t('bk.nameLabel')}</ThemedText>
        <AppTextInput value={typed} onChangeText={setTyped} maxLength={60} autoCapitalize="none" autoCorrect={false} />
        {error && (
          <ThemedText accessibilityLiveRegion="polite" type="small" themeColor="errorText">
            {error}
          </ThemedText>
        )}
        {busy ? (
          <ActivityIndicator />
        ) : (
          <AppButton title={t('bk.deleteConfirm')} variant="danger" onPress={confirm} disabled={typed !== name} />
        )}
        <AppButton title={t('common.cancel')} variant="secondary" onPress={onClose} disabled={busy} />
      </View>
    </BottomSheet>
  );
}
