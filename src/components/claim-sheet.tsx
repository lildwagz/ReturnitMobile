import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Switch, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BottomSheet } from '@/components/bottom-sheet';
import { ClaimPreview } from '@/components/claim-preview';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { ClaimOptions, createClaimPackage, discardClaimPdf } from '@/lib/claim-package';
import { Purchase } from '@/lib/purchase';

function Option({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, gap: Spacing.three }}>
      <ThemedText style={{ flex: 1 }}>{label}</ThemedText>
      <Switch value={value} onValueChange={onChange} disabled={disabled} accessibilityLabel={label} />
    </View>
  );
}

// The sheet behind "Buat paket klaim": three switches, one button, and the steps and failures of making the PDF.
export function ClaimSheet({ purchase, visible, onClose }: { purchase: Purchase; visible: boolean; onClose: () => void }) {
  const hasPhotos = (purchase.receipts ?? []).length > 0;
  const hasNotes = !!purchase.notes;
  const hasPrice = purchase.price !== null && purchase.price !== undefined;
  const [options, setOptions] = useState<ClaimOptions>({ price: true, notes: true, photos: true });
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [failed, setFailed] = useState<{ index: number; id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const skip = useRef<string[]>([]);
  const running = useRef(false); // a second tap before the first finished must not make a second PDF
  const [preview, setPreview] = useState<{ uri: string; skipped: number } | null>(null);
  const previewUri = useRef<string | null>(null);

  useEffect(() => {
    previewUri.current = preview?.uri ?? null;
  }, [preview]);

  // Leaving the screen with the preview open must not leave the PDF (personal data) in the cache.
  useEffect(
    () => () => {
      if (previewUri.current) discardClaimPdf(previewUri.current);
    },
    [],
  );

  function closePreview() {
    if (preview) discardClaimPdf(preview.uri);
    setPreview(null);
  }

  async function make() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setFailed(null);
    setError(null);
    try {
      const r = await createClaimPackage(purchase, options, skip.current, setStep);
      if (r.kind === 'ready') {
        skip.current = [];
        setPreview({ uri: r.uri, skipped: r.skipped });
        onClose();
      } else if (r.kind === 'receiptFailed') {
        setFailed({ index: r.index, id: r.id });
      } else {
        setError(r.message);
      }
    } finally {
      running.current = false;
      setBusy(false);
      setStep('');
    }
  }

  function skipFailed() {
    if (failed) skip.current = [...skip.current, failed.id];
    void make();
  }

  function close() {
    if (busy) return;
    skip.current = [];
    setFailed(null);
    setError(null);
    onClose();
  }

  return (
    <>
    <ClaimPreview uri={preview?.uri ?? null} skipped={preview?.skipped ?? 0} onClose={closePreview} />
    <BottomSheet visible={visible} onClose={close} title={t('claim.sheetTitle')}>
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('claim.intro')}
        </ThemedText>
        {hasPrice ? <Option label={t('claim.includePrice')} value={options.price} onChange={(v) => setOptions({ ...options, price: v })} disabled={busy} /> : null}
        {hasNotes ? <Option label={t('claim.includeNotes')} value={options.notes} onChange={(v) => setOptions({ ...options, notes: v })} disabled={busy} /> : null}
        {hasPhotos ? <Option label={t('claim.includePhotos')} value={options.photos} onChange={(v) => setOptions({ ...options, photos: v })} disabled={busy} /> : null}

        {failed ? (
          <View accessibilityLiveRegion="polite" style={{ gap: Spacing.two }}>
            <ThemedText style={{ fontWeight: '700' }}>{t('claim.receiptFailed', { n: failed.index })}</ThemedText>
            <AppButton title={t('detail.retry')} onPress={make} />
            <AppButton variant="secondary" title={t('claim.skipReceipt')} onPress={skipFailed} />
          </View>
        ) : (
          <>
            {error ? (
              <ThemedText accessibilityLiveRegion="polite" themeColor="textSecondary" style={{ fontWeight: '700' }}>
                {error}
              </ThemedText>
            ) : null}
            {busy ? (
              <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 48 }}>
                <ActivityIndicator />
                <ThemedText type="small" themeColor="textSecondary">
                  {step}
                </ThemedText>
              </View>
            ) : (
              <AppButton title={error ? t('detail.retry') : t('claim.make')} onPress={make} />
            )}
          </>
        )}
      </View>
    </BottomSheet>
    </>
  );
}
