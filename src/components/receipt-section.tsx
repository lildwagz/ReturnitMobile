import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { apiFetch } from '@/lib/auth';
import { CONNECTION_ERROR, Purchase, errorMessage } from '@/lib/purchase';
import { AppButton } from '@/components/app-button';
import { captureReceipt, formatSize, pickReceipt, uploadReceipt } from '@/lib/receipt';

type Props = {
  purchaseId: string;
  receipt?: Purchase['receipt'];
  onChanged: () => void;
};

export function ReceiptSection({ purchaseId, receipt, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);

  const isImage = !!receipt && receipt.contentType.startsWith('image/');

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
      setMessage(CONNECTION_ERROR);
      return null;
    }
  }, [purchaseId]);

  const loadPreview = useCallback(async () => {
    setMessage(null);
    setPreviewFailed(false);
    setPreviewUrl(await fetchLink());
  }, [fetchLink]);

  // Images appear automatically when the screen opens or the receipt changes.
  useEffect(() => {
    setPreviewUrl(null);
    if (isImage) loadPreview();
  }, [receipt, isImage, loadPreview]);

  async function openPdf() {
    setBusy(true);
    setMessage(null);
    const url = await fetchLink();
    if (url) {
      try {
        await Linking.openURL(url);
      } catch {
        setMessage('Tidak dapat membuka struk.');
      }
    }
    setBusy(false);
  }

  // Shared by the file picker and the camera.
  async function uploadUri(uri: string) {
    setBusy(true);
    const error = await uploadReceipt(purchaseId, uri);
    setBusy(false);
    if (!error) onChanged();
    else setMessage(error === CONNECTION_ERROR ? error + ' Catatan tetap tersimpan, coba unggah lagi.' : error);
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
    Alert.alert('Hapus struk?', 'File struk akan dihapus permanen.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const res = await apiFetch('/purchases/' + purchaseId + '/receipt', { method: 'DELETE' });
            if (res.status === 204) onChanged();
            else setMessage(await errorMessage(res));
          } catch {
            setMessage(CONNECTION_ERROR);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <View style={{ gap: 8 }}>
      <ThemedText type="small">Struk</ThemedText>
      {receipt ? (
        <>
          <ThemedText>{receipt.fileName + ' (' + formatSize(receipt.sizeBytes) + ')'}</ThemedText>

          {isImage && previewUrl && !previewFailed && (
            <Image
              source={{ uri: previewUrl }}
              style={{ width: '100%', height: 320, borderRadius: 12 }}
              resizeMode="contain"
              onError={() => setPreviewFailed(true)}
            />
          )}
          {isImage && !previewUrl && !message && <ActivityIndicator />}
          {isImage && previewFailed && (
            <View style={{ gap: 8 }}>
              <ThemedText themeColor="errorText">Pratinjau gagal dimuat.</ThemedText>
              <AppButton variant="secondary" title="Coba lagi" onPress={loadPreview} />
            </View>
          )}
          {isImage && message && !previewUrl && <AppButton variant="secondary" title="Coba lagi" onPress={loadPreview} />}

          {!isImage && <AppButton variant="secondary" title="Buka PDF" onPress={openPdf} disabled={busy} />}
          <AppButton variant="secondary" title="Ganti struk" onPress={pickAndUpload} disabled={busy} />
          <AppButton variant="secondary" title="Ambil foto baru" onPress={takePhoto} disabled={busy} />
          <AppButton title="Hapus struk" variant="danger" onPress={confirmRemove} disabled={busy} />
        </>
      ) : (
        <>
          <ThemedText>Belum ada struk</ThemedText>
          <AppButton title="Unggah struk" onPress={pickAndUpload} disabled={busy} />
          <AppButton variant="secondary" title="Ambil foto" onPress={takePhoto} disabled={busy} />
        </>
      )}
      {cameraBlocked && <AppButton variant="secondary" title="Buka pengaturan aplikasi" onPress={() => Linking.openSettings()} />}
      {busy && <ActivityIndicator />}
      {message && <ThemedText themeColor="errorText">{message}</ThemedText>}
    </View>
  );
}