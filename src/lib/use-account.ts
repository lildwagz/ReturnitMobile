import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { apiFetch, login } from '@/lib/auth';
import { CONNECTION_ERROR, errorMessage } from '@/lib/purchase';

export type Account = {
  id: string;
  email: string;
  displayName?: string | null;
  createdAt: string;
  deletionScheduledFor?: string | null;
};

async function errorCode(res: Response): Promise<string | null> {
  try {
    return (await res.clone().json())?.error?.code ?? null;
  } catch {
    return null;
  }
}

// The signed-in account (GET /account) and its deletion flow, shared by Pengaturan and the Akun screen.
export function useAccount(signedIn: boolean | null) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadAccount = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await apiFetch('/account');
      if (res.ok) setAccount(await res.json());
      else setLoadError(await errorMessage(res));
    } catch {
      setLoadError(CONNECTION_ERROR);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (signedIn) loadAccount();
      else setAccount(null);
    }, [signedIn, loadAccount]),
  );

  async function requestDeletion() {
    setBusy(true);
    setMessage(null);
    try {
      let res = await apiFetch('/account', { method: 'DELETE' });
      if (res.status === 401 && (await errorCode(res)) === 'reauthentication_required') {
        setMessage('Untuk keamanan, masuk sekali lagi untuk melanjutkan.');
        const problem = await login(true);
        if (problem) {
          setMessage('Masuk ulang tidak selesai, jadi penghapusan dibatalkan.');
          return;
        }
        res = await apiFetch('/account', { method: 'DELETE' });
      }
      if (res.status === 202) {
        setMessage(null);
        await loadAccount();
      } else if (res.status === 401) {
        setMessage('Login belum cukup baru. Coba lagi.');
      } else {
        setMessage(await errorMessage(res));
      }
    } catch {
      setMessage(CONNECTION_ERROR);
    } finally {
      setBusy(false);
    }
  }

  function confirmDeletion() {
    Alert.alert(
      'Hapus akun?',
      'Akun dijadwalkan terhapus permanen setelah masa tunggu (biasanya 7 hari). Selama masa tunggu Anda dapat membatalkan. Setelah itu, semua pembelian, struk, dan pengingat hilang dan tidak dapat dipulihkan.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus akun', style: 'destructive', onPress: requestDeletion },
      ],
    );
  }

  async function cancelDeletion() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await apiFetch('/account/deletion/cancel', { method: 'POST' });
      if (res.status === 204) await loadAccount();
      else if (res.status === 409) setMessage('Masa tunggu sudah berakhir, akun tidak dapat dipulihkan lagi.');
      else setMessage(await errorMessage(res));
    } catch {
      setMessage(CONNECTION_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return { account, loadError, busy, message, loadAccount, confirmDeletion, cancelDeletion };
}
