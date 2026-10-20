import { useEffect, useState } from 'react';

import { getAccessToken, subscribe } from '@/lib/auth';

// null = still checking, true = logged in, false = logged out
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const check = async () => setSignedIn(!!(await getAccessToken()));
    check();
    return subscribe(check);
  }, []);
  return signedIn;
}