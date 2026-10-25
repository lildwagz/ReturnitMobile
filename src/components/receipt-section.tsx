import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, View } from 'react-native';

import { PdfViewer } from '@/components/pdf-viewer';
import { t } from '@/i18n';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
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
  const pickAndUpload = () => choose(pickReceipt);
  const takePhoto = () => choose(captureReceipt);

  function confirmRemove() {
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
    <ThemedView type="backgroundElement" style={{ borderRadius: 16, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <ThemedView
          type="background"
          style={{ width: 50, height: 58, borderRadius: 8, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText themeColor="textSecondary" style={{ fontSize: 22 }}>
            ▤
          </ThemedText>
        </ThemedView>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontWeight: 700 }}>{t('rs.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {receipt ? receipt.fileName + ' (' + formatSize(receipt.sizeBytes) + ')' : t('rs.none')}
          </ThemedText>
        </View>
        {!receipt && <AppButton variant="secondary" title={t('rs.add')} onPress={pickAndUpload} disabled={busy} />}
      </View>
      {receipt ? (
        <>
          {isImage && previewUri && !previewFailed && (
            <Image
              source={{ uri: previewUri }}
              style={{ width: '100%', height: 320, borderRadius: 12 }}
              resizeMode="contain"
              onError={previewBroken}
            />
          )}
          {isImage && !previewUri && !message && <ActivityIndicator />}
          {isImage && previewFailed && (
            <View style={{ gap: 8 }}>
              <ThemedText themeColor="errorText">{t('rs.previewFailed')}</ThemedText>
              <AppButton variant="secondary" title={t('rs.retry')} onPress={loadPreview} />
            </View>
          )}
          {isImage && message && !previewUri && <AppButton variant="secondary" title={t('rs.retry')} onPress={loadPreview} />}

          {isPdf && previewUri && !previewFailed && (
            <View style={{ gap: 6 }}>
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
            <View style={{ gap: 8 }}>
              <ThemedText themeColor="errorText">{t('rs.pdfFailed')}</ThemedText>
              <AppButton variant="secondary" title={t('rs.retry')} onPress={loadPreview} />
              <AppButton variant="secondary" title={t('rs.pdfDownload')} onPress={openPdf} disabled={busy} />
            </View>
          )}
          {isPdf && message && !previewUri && <AppButton variant="secondary" title={t('rs.retry')} onPress={loadPreview} />}
          <AppButton variant="secondary" title={t('rs.replace')} onPress={pickAndUpload} disabled={busy} />
          <AppButton variant="secondary" title={t('rs.newPhoto')} onPress={takePhoto} disabled={busy} />
          <AppButton title={t('rs.removeReceipt')} variant="danger" onPress={confirmRemove} disabled={busy} />
        </>
      ) : (
        <AppButton variant="secondary" title={t('rs.takePhoto')} onPress={takePhoto} disabled={busy} />
      )}
      {cameraBlocked && <AppButton variant="secondary" title={t('rs.openSettings')} onPress={() => Linking.openSettings()} />}
      {busy && <ActivityIndicator />}
      {message && <ThemedText themeColor="errorText">{message}</ThemedText>}
    </ThemedView>
  );
}