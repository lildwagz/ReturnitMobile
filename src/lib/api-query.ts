import { apiFetch } from '@/lib/auth';
import { CONNECTION_ERROR, errorMessage } from '@/lib/purchase';

// GET a JSON endpoint for a query: any failure becomes an Error whose message is already fit to show the user.
export async function apiJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(path);
  } catch {
    throw new Error(CONNECTION_ERROR);
  }
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as T;
}
