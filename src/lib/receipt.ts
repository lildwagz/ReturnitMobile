import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { t } from '@/i18n';
import { apiFetch } from '@/lib/auth';
import { connectionError, errorMessage } from '@/lib/purchase';

export const MAX_BYTES = 10 * 1024 * 1024;
export const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

export function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? (bytes / 1024 / 1024).toFixed(1) + ' MB'
    : Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

export async function uploadError(res: Response): Promise<string> {
  if (res.status === 413) return t('receipt.tooBig');
  if (res.status === 415) return t('receipt.badType');
  if (res.status === 422) return t('receipt.infected');
  if (res.status === 503) return t('receipt.scannerDown');
  return errorMessage(res);
}

// A file chosen by the user, not yet uploaded. `error` is set instead of `uri` when nothing usable was chosen
// (a cancelled picker returns neither).
export type PickedReceipt = { uri?: string; name?: string; error?: string; cameraBlocked?: boolean };

export async function pickReceipt(): Promise<PickedReceipt> {
  let picked;
  try {
    picked = await DocumentPicker.getDocumentAsync({ type: ALLOWED, copyToCacheDirectory: true });
  } catch {
    return { error: t('receipt.pickerFailed') };
  }
  if (picked.canceled) return {};
  const file = picked.assets[0];
  if (file.mimeType && !ALLOWED.includes(file.mimeType)) {
    return { error: t('receipt.badType') };
  }
  if (file.size && file.size > MAX_BYTES) return { error: t('receipt.tooBig') };
  return { uri: file.uri, name: file.name };
}

export async function captureReceipt(): Promise<PickedReceipt> {
  let perm;
  try {
    perm = await ImagePicker.requestCameraPermissionsAsync();
  } catch {
    return { error: t('receipt.cameraPermFailed') };
  }
  if (!perm.granted) {
    return { error: t('receipt.cameraNeeded'), cameraBlocked: !perm.canAskAgain };
  }
  let shot;
  try {
    shot = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
  } catch {
    return { error: t('receipt.cameraFailed') };
  }
  if (shot.canceled) return {};
  const photo = shot.assets[0];
  if (photo.fileSize && photo.fileSize > MAX_BYTES) return { error: t('receipt.tooBig') };
  return { uri: photo.uri, name: photo.fileName ?? t('receipt.photoName') };
}

// Returns null when the receipt was stored, or a message for the user.
export async function uploadReceipt(purchaseId: string, uri: string): Promise<string | null> {
  const form = new FormData();
  form.append('file', new File(uri));
  try {
    const res = await apiFetch('/purchases/' + purchaseId + '/receipt', { method: 'POST', body: form });
    return res.status === 201 ? null : await uploadError(res);
  } catch {
    return connectionError();
  }
}
