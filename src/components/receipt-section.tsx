import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Image, Linking, View } from 'react-native';
import Pdf from 'react-native-pdf';

import { ThemedText } from '@/components/themed-text';
import { apiFetch } from '@/lib/auth';
import { CONNECTION_ERROR, Purchase, errorMessage } from '@/lib/purchase';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? (bytes / 1024 / 1024).toFixed(1) + ' MB'
    : Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

async function uploadError(res: Response): Promise<string> {
  if (res.status === 413) return 'Ukuran file melebihi 10 MB.';
  if (res.status === 415) return 'Jenis file tidak didukung. Gunakan PDF, JPEG atau PNG.';
  if (res.status === 422) return 'File ditolak karena terdeteksi berbahaya.';
  if (res.status === 503) return 'Pemindai keamanan sedang tidak tersedia. Coba lagi nanti.';
  return errorMessage(res);
}

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
    if (isImage || isPdf) loadPreview();
  }, [receipt, isImage, isPdf, loadPreview]);

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
    const form = new FormData();
    form.append('file', new File(uri));
    setBusy(true);
    try {
      const res = await apiFetch('/purchases/' + purchaseId + '/receipt', { method: 'POST', body: form });
      if (res.status === 201) onChanged();
      else setMessage(await uploadError(res));
    } catch {
      setMessage(CONNECTION_ERROR + ' Catatan tetap tersimpan, coba unggah lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function pickAndUpload() {
    setMessage(null);
    setCameraBlocked(false);
    let picked;
    try {
      picked = await DocumentPicker.getDocumentAsync({ type: ALLOWED, copyToCacheDirectory: true });
    } catch {
      setMessage('Tidak dapat membuka pemilih file.');
      return;
    }
    if (picked.canceled) return;
    const file = picked.assets[0];

    if (file.mimeType && !ALLOWED.includes(file.mimeType)) {
      setMessage('Jenis file tidak didukung. Gunakan PDF, JPEG atau PNG.');
      return;
    }
    if (file.size && file.size > MAX_BYTES) {
      setMessage('Ukuran file melebihi 10 MB.');
      return;
    }
    await uploadUri(file.uri);
  }

  async function takePhoto() {
    setMessage(null);
    setCameraBlocked(false);
    let perm;
    try {
      perm = await ImagePicker.requestCameraPermissionsAsync();
    } catch {
      setMessage('Tidak dapat meminta izin kamera.');
      return;
    }
    if (!perm.granted) {
      setCameraBlocked(!perm.canAskAgain);
      setMessage('Izin kamera diperlukan untuk mengambil foto struk.');
      return;
    }
    let shot;
    try {
      shot = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    } catch {
      setMessage('Tidak dapat membuka kamera.');
      return;
    }
    if (shot.canceled) return;
    const photo = shot.assets[0];
    if (photo.fileSize && photo.fileSize > MAX_BYTES) {
      setMessage('Ukuran file melebihi 10 MB.');
      return;
    }
    await uploadUri(photo.uri);
  }

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
              <ThemedText style={{ color: '#C62828' }}>Pratinjau gagal dimuat.</ThemedText>
              <Button title="Coba lagi" onPress={loadPreview} />
            </View>
          )}
          {isImage && message && !previewUrl && <Button title="Coba lagi" onPress={loadPreview} />}

          {isPdf && previewUrl && !previewFailed && (
            <View style={{ gap: 6 }}>
              <Pdf
                source={{ uri: previewUrl, cache: false }}
                horizontal
                enablePaging
                trustAllCerts={false}
                style={{ width: '100%', height: 420, backgroundColor: '#8882' }}
                onLoadComplete={(pages) => setPdfPages(pages)}
                onPageChanged={(page) => setPdfPage(page)}
                onError={() => setPreviewFailed(true)}
              />
              {pdfPages > 0 && (
                <ThemedText type="small" style={{ textAlign: 'center' }}>
                  {'Halaman ' + pdfPage + ' dari ' + pdfPages}
                </ThemedText>
              )}
            </View>
          )}
          {isPdf && !previewUrl && !message && <ActivityIndicator />}
          {isPdf && previewFailed && (
            <View style={{ gap: 8 }}>
              <ThemedText style={{ color: '#C62828' }}>Pratinjau PDF gagal dimuat.</ThemedText>
              <Button title="Coba lagi" onPress={loadPreview} />
              <Button title="Unduh PDF (cadangan)" onPress={openPdf} disabled={busy} />
            </View>
          )}
          {isPdf && message && !previewUrl && <Button title="Coba lagi" onPress={loadPreview} />}
          <Button title="Ganti struk" onPress={pickAndUpload} disabled={busy} />
          <Button title="Ambil foto baru" onPress={takePhoto} disabled={busy} />
          <Button title="Hapus struk" color="#C62828" onPress={confirmRemove} disabled={busy} />
        </>
      ) : (
        <>
          <ThemedText>Belum ada struk</ThemedText>
          <Button title="Unggah struk" onPress={pickAndUpload} disabled={busy} />
          <Button title="Ambil foto" onPress={takePhoto} disabled={busy} />
        </>
      )}
      {cameraBlocked && <Button title="Buka pengaturan aplikasi" onPress={() => Linking.openSettings()} />}
      {busy && <ActivityIndicator />}
      {message && <ThemedText style={{ color: '#C62828' }}>{message}</ThemedText>}
    </View>
  );
}