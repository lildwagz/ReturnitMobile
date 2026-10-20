import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useState } from 'react';
import { ActivityIndicator, Alert, Button, Linking, View } from 'react-native';

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

  async function pickAndUpload() {
    setMessage(null);
    let picked;
    try {
      picked = await DocumentPicker.getDocumentAsync({
        type: ALLOWED,
        copyToCacheDirectory: true,
      });
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

    console.log('PICKED:', file.uri.split(':')[0], file.mimeType, file.size);
    const form = new FormData();
    form.append('file', new File(file.uri));

    setBusy(true);
    try {
      const res = await apiFetch('/purchases/' + purchaseId + '/receipt', {
        method: 'POST',
        body: form,
      });
      if (res.status === 201) onChanged();
      else setMessage(await uploadError(res));
    } catch (e) {
      console.log('UPLOAD ERROR:', String(e));
      setMessage(CONNECTION_ERROR + ' Catatan tetap tersimpan, coba unggah lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function view() {
    setMessage(null);
    setBusy(true);
    try {
      const res = await apiFetch('/purchases/' + purchaseId + '/receipt');
      if (!res.ok) {
        setMessage(await errorMessage(res));
        return;
      }
      const data = await res.json();
      // The link is valid only a few minutes: open it now, never store or log it.
      console.log('RECEIPT HOST:', String(data.url).split('/')[2]);
      await Linking.openURL(data.url);
    } catch {
      setMessage('Tidak dapat membuka struk.');
    } finally {
      setBusy(false);
    }
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
          <Button title="Lihat struk" onPress={view} disabled={busy} />
          <Button title="Ganti struk" onPress={pickAndUpload} disabled={busy} />
          <Button title="Hapus struk" color="#C62828" onPress={confirmRemove} disabled={busy} />
        </>
      ) : (
        <>
          <ThemedText>Belum ada struk</ThemedText>
          <Button title="Unggah struk" onPress={pickAndUpload} disabled={busy} />
        </>
      )}
      {busy && <ActivityIndicator />}
      {message && <ThemedText style={{ color: '#C62828' }}>{message}</ThemedText>}
    </View>
  );
}