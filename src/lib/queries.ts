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

export type SummaryItem = { id: string; productName: string; date: string };
export type Summary = {
  counts: { active: number; expiring: number; expired: number; unknown: number; total: number };
  coveredValue: { currency: string; amount: number }[];
  nextExpiring: SummaryItem | null;
  nextReturn: SummaryItem | null;
};

// Home: one call for the counts, the covered value and the next dates, one for the newest purchases.
export function useHomeData(enabled: boolean) {
  const summary = useQuery({ queryKey: keys.summary, enabled, queryFn: () => apiJson<Summary>('/summary') });
  const recent = useQuery({
    queryKey: keys.recent,
    enabled,
    queryFn: async () => (await apiJson<PurchasePage>('/purchases?pageSize=5')).items,
  });
  const all = [summary, recent];
  return {
    summary: summary.data ?? null,
    active: summary.data?.counts.active ?? null,
    expiring: summary.data?.counts.expiring ?? null,
    total: summary.data?.counts.total ?? null,
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
