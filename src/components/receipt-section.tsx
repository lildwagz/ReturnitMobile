import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, I18nManager, Image, Linking, Modal, Pressable, View } from 'react-native';

import { PdfViewer } from '@/components/pdf-viewer';
import { Icon } from '@/components/icon';
import { t } from '@/i18n';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Radius, SoftShadow, Spacing } from '@/constants/theme';
import { apiFetch } from '@/lib/auth';
import { connectionError, Purchase, errorMessage } from '@/lib/purchase';
import { AppButton } from '@/components/app-button';
import { captureReceipt, formatSize, pickReceipt, uploadReceipt } from '@/lib/receipt';
import { cachedReceipt, downloadReceipt, forgetReceipt, receiptExt, receiptKey } from '@/lib/receipt-cache';

type Props = {
  purchaseId: string;
  receipt?: Purchase['receipt'];
  onChanged: () => void;
};

export function ReceiptSection({ purchaseId, receipt, onChanged }: Props) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // The receipt as a local file. It comes from the cache when this receipt was viewed before, so it shows at once.
  const key = receipt ? receiptKey(purchaseId, receipt) : null;
  const ext = receipt ? receiptExt(receipt.contentType) : '';
  const [previewUri, setPreviewUri] = useState<string | null>(() => (key ? cachedReceipt(key, ext) : null));
  const [previewFailed, setPreviewFailed] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPages, setPdfPages] = useState(0);  

  const isImage = !!receipt && receipt.contentType.startsWith('image/');
  const isPdf = !!receipt && receipt.contentType === 'application/pdf';

  // Gets a fresh short-lived link. Kept in memory only, never stored or logged.
  const fetchLink = useCallback(async (): Promise<string | null> => {
    try {
      const res = await apiFetch('/purchases/' + purchaseId + '/receipt');
      if (!res.ok) {
        setMessage(await errorMessage(res));
        return null;
      }
      return (await res.json()).url as string;
    } catch {
      setMessage(connectionError());
      return null;
    }
  }, [purchaseId]);

  const loadPreview = useCallback(async () => {
    if (!key) return;
    setMessage(null);
    setPreviewFailed(false);
    const cached = cachedReceipt(key, ext);
    if (cached) {
      setPreviewUri(cached);
      return;
    }
    const url = await fetchLink();
    if (!url) return;
    try {
      setPreviewUri(await downloadReceipt(url, key, ext));
    } catch {
      setPreviewFailed(true);
    }
  }, [key, ext, fetchLink]);

  // The preview appears when the screen opens or the receipt changes.
  useEffect(() => {
    setPreviewUri(key ? cachedReceipt(key, ext) : null);
    if (isImage || isPdf) loadPreview();
  }, [key, ext, isImage, isPdf, loadPreview]);

  // A cached file that cannot be shown is dropped, so "Coba lagi" downloads it afresh.
  function previewBroken() {
    forgetReceipt(purchaseId);
    setPreviewUri(null);
    setPreviewFailed(true);
  }

  async function openPdf() {
    setBusy(true);
    setMessage(null);
    const url = await fetchLink();
    if (url) {
      try {
        await Linking.openURL(url);
      } catch {
        setMessage(t('rs.cannotOpen'));
      }
    }
    setBusy(false);
  }

  // Shared by the file picker and the camera.
  async function uploadUri(uri: string) {
    setBusy(true);
    const error = await uploadReceipt(purchaseId, uri);
    setBusy(false);
    if (!error) {
      forgetReceipt(purchaseId);
      onChanged();
    } else setMessage(error === connectionError() ? t('rs.savedRetryUpload', { error }) : error);
  }

  async function choose(pick: typeof pickReceipt) {
    setMessage(null);
    setCameraBlocked(false);
    const r = await pick();
    if (r.error) {
      setMessage(r.error);
      setCameraBlocked(!!r.cameraBlocked);
    } else if (r.uri) await uploadUri(r.uri);
  }
  const pickAndUpload = () => {
    setMenuOpen(false);
    return choose(pickReceipt);
  };
  const takePhoto = () => {
    setMenuOpen(false);
    return choose(captureReceipt);
  };

  function confirmRemove() {
    setMenuOpen(false);
    Alert.alert(t('rs.removeTitle'), t('rs.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('rs.remove'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const res = await apiFetch('/purchases/' + purchaseId + '/receipt', { method: 'DELETE' });
            if (res.status === 204) {
              forgetReceipt(purchaseId);
              onChanged();
            } else setMessage(await errorMessage(res));
          } catch {
            setMessage(connectionError());
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <ThemedView type="backgroundElement" style={{ borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.two, ...SoftShadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <ThemedView
          type="background"
          style={{ width: 50, height: 58, borderRadius: Radius.sm, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="file-text" size={24} color={theme.textSecondary} decorative />
        </ThemedView>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontWeight: 700 }}>{t('rs.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {receipt ? receipt.fileName + ' (' + formatSize(receipt.sizeBytes) + ')' : t('rs.none')}
          </ThemedText>
        </View>
        {!receipt && <AppButton variant="secondary" title={t('rs.add')} onPress={pickAndUpload} disabled={busy} />}
        {receipt && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('detail.receiptActions')}
            onPress={() => setMenuOpen(true)}
            disabled={busy}
            style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed || busy ? 0.5 : 1 })}>
            <Icon name="more-vertical" size={20} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
      {receipt ? (
        <>
          {isImage && previewUri && !previewFailed && (
            <Image
              source={{ uri: previewUri }}
              style={{ width: '100%', height: 320, borderRadius: Radius.sm }}
              resizeMode="contain"
              onError={previewBroken}
            />
          )}
          {isImage && !previewUri && !message && <ActivityIndicator />}
          {isImage && previewFailed && (
            <View style={{ gap: Spacing.two }}>
              <ThemedText themeColor="errorText">{t('rs.previewFailed')}</ThemedText>
              <AppButton variant="secondary" title={t('rs.retry')} onPress={loadPreview} />
            </View>
          )}
          {isImage && message && !previewUri && <AppButton variant="secondary" title={t('rs.retry')} onPress={loadPreview} />}

          {isPdf && previewUri && !previewFailed && (
            <View style={{ gap: Spacing.two }}>
              <PdfViewer
                uri={previewUri}
                style={{ width: '100%', height: 420, backgroundColor: '#8882' }}
                onLoadComplete={(pages) => setPdfPages(pages)}
                onPageChanged={(page) => setPdfPage(page)}
                onError={previewBroken}
              />
              {pdfPages > 0 && (
                <ThemedText type="small" style={{ textAlign: 'center' }}>
                  {t('rs.pdfPage', { page: pdfPage, pages: pdfPages })}
                </ThemedText>
              )}
            </View>
          )}
          {isPdf && !previewUri && !message && <ActivityIndicator />}
          {isPdf && previewFailed && (
            <View style={{ gap: Spacing.two }}>
              <ThemedText themeColor="errorText">{t('rs.pdfFailed')}</ThemedText>
              <AppButton variant="secondary" title={t('rs.retry')} onPress={loadPreview} />
              <AppButton variant="secondary" title={t('rs.pdfDownload')} onPress={openPdf} disabled={busy} />
            </View>
          )}
          {isPdf && message && !previewUri && <AppButton variant="secondary" title={t('rs.retry')} onPress={loadPreview} />}
        </>
      ) : (
        <AppButton variant="secondary" title={t('rs.takePhoto')} onPress={takePhoto} disabled={busy} />
      )}
      {cameraBlocked && <AppButton variant="secondary" title={t('rs.openSettings')} onPress={() => Linking.openSettings()} />}
      {busy && <ActivityIndicator />}
      {message && <ThemedText themeColor="errorText">{message}</ThemedText>}

      {/* The "..." menu on the receipt card: replace file, take a new photo, remove (confirmed). */}
      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0B1220AA' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => setMenuOpen(false)} style={{ flex: 1 }} />
          <View
            accessibilityViewIsModal
            accessibilityLabel={t('detail.receiptActions')}
            style={{
              backgroundColor: theme.background,
              borderTopLeftRadius: Radius.xl,
              borderTopRightRadius: Radius.xl,
              padding: Spacing.four,
              paddingTop: Spacing.two,
              gap: Spacing.two,
            }}>
            <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border, marginBottom: Spacing.two }} />
            <ThemedText type="subtitle">{t('detail.receiptActions')}</ThemedText>
            {(
              [
                { icon: 'file-plus' as const, title: t('rs.replace'), danger: false, onPress: pickAndUpload },
                { icon: 'camera' as const, title: t('rs.newPhoto'), danger: false, onPress: takePhoto },
                { icon: 'trash-2' as const, title: t('rs.removeReceipt'), danger: true, onPress: confirmRemove },
              ]
            ).map((r) => (
              <Pressable
                key={r.icon}
                accessibilityRole="button"
                accessibilityLabel={r.title}
                onPress={r.onPress}
                disabled={busy}
                android_ripple={{ color: r.danger ? theme.errorText + '1F' : theme.primary + '1F' }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.three,
                  minHeight: 56,
                  padding: Spacing.three,
                  borderRadius: Radius.sm,
                  backgroundColor: theme.backgroundElement,
                  opacity: pressed || busy ? 0.6 : 1,
                })}>
                <Icon name={r.icon} size={20} color={r.danger ? theme.errorText : theme.textSecondary} decorative />
                <ThemedText style={{ fontWeight: '700', color: r.danger ? theme.errorText : theme.text }}>{r.title}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}
