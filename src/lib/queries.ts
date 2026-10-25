import { useFocusEffect } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { apiJson } from '@/lib/api-query';
import { Purchase } from '@/lib/purchase';
import { keys, queryClient } from '@/lib/query-client';

export type PurchasePage = { items: Purchase[]; page: number; pageSize: number; total: number };

export const PAGE_SIZE = 20;

// Refreshes the queries under `queryKey` when a screen comes into view, but only the ones that are older than
// their staleTime: going back and forth between tabs inside that window costs no request.
export function useRefetchStaleOnFocus(queryKey: readonly unknown[]) {
  const id = JSON.stringify(queryKey);
  useFocusEffect(
    useCallback(() => {
      queryClient.refetchQueries({ queryKey: JSON.parse(id), stale: true, type: 'active' });
    }, [id]),
  );
}

// ---- Home ----

function countQuery(status: string, enabled: boolean) {
  return {
    queryKey: keys.purchaseCount(status),
    enabled,
    queryFn: async () =>
      (await apiJson<PurchasePage>('/purchases?' + (status ? `warrantyStatus=${status}&` : '') + 'pageSize=1')).total,
  };
}

export function useHomeData(enabled: boolean) {
  const active = useQuery(countQuery('active', enabled));
  const expiring = useQuery(countQuery('expiring', enabled));
  const total = useQuery(countQuery('', enabled));
  const recent = useQuery({
    queryKey: keys.recent,
    enabled,
    queryFn: async () => (await apiJson<PurchasePage>('/purchases?pageSize=5')).items,
  });
  const all = [active, expiring, total, recent];
  return {
    active: active.data ?? null,
    expiring: expiring.data ?? null,
    total: total.data ?? null,
    recent: recent.data ?? [],
    error: all.find((q) => q.error)?.error?.message ?? null,
    loading: all.some((q) => q.isFetching),
    refetch: async () => {
      await Promise.all(all.map((q) => q.refetch()));
    },
  };
}

// ---- Pembelian ----

export function usePurchaseList(status: string, q: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: keys.purchaseList(status, q),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      let path = `/purchases?page=${pageParam}&pageSize=${PAGE_SIZE}`;
      if (q) path += '&q=' + encodeURIComponent(q);
      if (status) path += '&warrantyStatus=' + status;
      return apiJson<PurchasePage>(path);
    },
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

// ---- Detail ----

export function usePurchase(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: keys.purchase(String(id)),
    enabled: enabled && !!id,
    queryFn: () => apiJson<Purchase>('/purchases/' + id),
  });
}

// ---- Pengingat ----

// Purchases whose warranty ends within 30 days or has ended. Best effort: a failure just gives an empty list.
export function useAttention(enabled: boolean) {
  return useQuery({
    queryKey: keys.attention,
    enabled,
    queryFn: async () => {
      const items: Purchase[] = [];
      for (const status of ['expiring', 'expired']) {
        try {
          items.push(...(await apiJson<PurchasePage>(`/purchases?warrantyStatus=${status}&pageSize=10`)).items);
        } catch {
          // the rest of the screen works without this list
        }
      }
      return items;
    },
  });
}

export function useReminderPrefs<T>(enabled: boolean) {
  return useQuery({ queryKey: keys.prefs, enabled, queryFn: () => apiJson<T>('/reminder-preferences') });
}

export function useNotifications<T>(unreadOnly: boolean, enabled: boolean) {
  return useQuery({
    queryKey: keys.notifications(unreadOnly),
    enabled,
    queryFn: () => apiJson<T[]>('/notifications?limit=50' + (unreadOnly ? '&unreadOnly=true' : '')),
  });
}

// ---- Akun ----

export function useAccountQuery<T>(enabled: boolean) {
  return useQuery({ queryKey: keys.account, enabled, queryFn: () => apiJson<T>('/account') });
}
