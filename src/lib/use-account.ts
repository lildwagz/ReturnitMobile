import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { apiFetch, login } from '@/lib/auth';
import { CONNECTION_ERROR, errorMessage } from '@/lib/purchase';
import { useAccountQuery, useRefetchStaleOnFocus } from '@/lib/queries';
import { keys } from '@/lib/query-client';

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
  const query = useAccountQuery<Account>(signedIn === true);
  const account = query.data ?? null;
  const loadError = query.error ? query.error.message : null;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useRefetchStaleOnFocus(keys.account);

  // Re-reads the account right away (after the deletion state changed, or for the "Coba lagi" button).
  const loadAccount = useCallback(async () => {
    await query.refetch();
  }, [query]);

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
