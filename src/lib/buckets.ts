import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import { t } from '@/i18n';
import { apiJson } from '@/lib/api-query';
import { apiFetch } from '@/lib/auth';
import { connectionError } from '@/lib/purchase';
import { invalidatePurchases, keys, queryClient } from '@/lib/query-client';

export type Bucket = {
  id: string;
  name: string;
  personal: boolean;
  role: 'owner' | 'member';
  notify: boolean;
  memberCount: number;
  purchaseCount: number;
  createdAt: string;
  // The first few members (display names), for the avatar stack. Absent on an older server.
  members?: { id: string; name: string }[];
};

export type Member = { id: string; name: string; role: 'owner' | 'member'; joinedAt: string; you: boolean };

export type InvitePreview = { bucketId?: string; bucketName: string; invitedBy: string | null; memberCount: number; full: boolean };

// The limits the server enforces (internal/buckets): shown so a person knows why "Join" or "Create" was refused.
export const MAX_MEMBERS = 6;

// ---- The bucket chosen in the switcher (null = every bucket) ----
// In memory only: the app starts on "All" every time, which is also where nothing is hidden by mistake.

let selected: string | null = null;
const listeners = new Set<() => void>();

export function selectBucket(id: string | null) {
  if (selected === id) return;
  selected = id;
  listeners.forEach((l) => l());
}

export function useSelectedBucket(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => selected,
    () => selected,
  );
}

// A bucket the person is no longer in (left, removed, deleted) must not stay selected.
export function dropSelectionIfGone(buckets: Bucket[]) {
  if (selected && !buckets.some((b) => b.id === selected)) selectBucket(null);
}

// ---- Reading ----

export function useBuckets(enabled: boolean) {
  return useQuery({
    queryKey: keys.buckets,
    enabled,
    queryFn: async () => {
      const items = (await apiJson<{ items: Bucket[] }>('/buckets')).items;
      dropSelectionIfGone(items);
      return items;
    },
  });
}

export function useMembers(id: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.bucketMembers(id),
    enabled,
    queryFn: async () => (await apiJson<{ items: Member[] }>('/buckets/' + id + '/members')).items,
  });
}

// The name of a bucket as shown on a purchase: nothing for the personal bucket or when there is only one bucket.
export function bucketLabel(buckets: Bucket[] | undefined, id: string | null | undefined): string | null {
  if (!buckets || buckets.length < 2 || !id) return null;
  const b = buckets.find((x) => x.id === id);
  return b && !b.personal ? b.name : null;
}

export function bucketDisplayName(b: Bucket): string {
  return b.personal ? t('bk.personal') : b.name;
}

// ---- Writing ----
// Every call answers { ok: true, data } or { ok: false, error } where error is already fit to show the person.

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function errorText(res: Response): Promise<string> {
  let code = '';
  try {
    code = (await res.clone().json())?.error?.code ?? '';
  } catch {
    // no body
  }
  switch (code) {
    case 'invite_gone':
      return t('bk.err.inviteGone');
    case 'bucket_full':
      return t('bk.err.full', { n: MAX_MEMBERS });
    case 'already_member':
      return t('bk.err.already');
    case 'bucket_limit':
      return t('bk.err.limit');
    case 'transfer_first':
      return t('bk.err.transferFirst');
    case 'not_owner':
      return t('bk.err.notOwner');
    case 'not_found':
      return t('bk.err.notFound');
    case 'rate_limited':
      return t('bk.err.tooMany');
    default:
      return res.status === 400 ? t('bk.err.invalid') : t('error.generic');
  }
}

async function call<T>(path: string, init: RequestInit, okStatus: number[], read: (res: Response) => Promise<T>): Promise<Result<T>> {
  try {
    const res = await apiFetch(path, init);
    if (!okStatus.includes(res.status)) return { ok: false, error: await errorText(res) };
    return { ok: true, data: await read(res) };
  } catch {
    return { ok: false, error: connectionError() };
  }
}

const json = (body: unknown): RequestInit => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const none = async () => undefined;

// Anything that changes who sees what: the bucket list, its members, and every purchase list and summary.
function changed(id?: string) {
  queryClient.invalidateQueries({ queryKey: keys.buckets });
  if (id) queryClient.invalidateQueries({ queryKey: keys.bucketMembers(id) });
  invalidatePurchases();
}

export async function createBucket(name: string): Promise<Result<Bucket>> {
  const r = await call('/buckets', { method: 'POST', ...json({ name }) }, [201], (res) => res.json() as Promise<Bucket>);
  if (r.ok) changed();
  return r;
}

export async function renameBucket(id: string, name: string): Promise<Result<Bucket>> {
  const r = await call('/buckets/' + id, { method: 'PATCH', ...json({ name }) }, [200], (res) => res.json() as Promise<Bucket>);
  if (r.ok) changed(id);
  return r;
}

export async function deleteBucket(id: string, confirmName: string): Promise<Result<void>> {
  const r = await call('/buckets/' + id, { method: 'DELETE', ...json({ confirmName }) }, [204], none);
  if (r.ok) changed(id);
  return r;
}

export async function removeMember(id: string, userId: string): Promise<Result<void>> {
  const r = await call('/buckets/' + id + '/members/' + userId, { method: 'DELETE' }, [204], none);
  if (r.ok) changed(id);
  return r;
}

export async function transferOwner(id: string, userId: string): Promise<Result<void>> {
  const r = await call('/buckets/' + id + '/owner', { method: 'PUT', ...json({ userId }) }, [204], none);
  if (r.ok) changed(id);
  return r;
}

export async function setNotify(id: string, notify: boolean): Promise<Result<Bucket>> {
  const r = await call('/buckets/' + id + '/notify', { method: 'PUT', ...json({ notify }) }, [200], (res) => res.json() as Promise<Bucket>);
  if (r.ok) changed(id);
  return r;
}

export async function createInvite(id: string): Promise<Result<{ token: string; expiresAt: string }>> {
  return call('/buckets/' + id + '/invites', { method: 'POST' }, [201], (res) => res.json() as Promise<{ token: string; expiresAt: string }>);
}

export async function previewInvite(token: string): Promise<Result<InvitePreview>> {
  return call('/invites/preview', { method: 'POST', ...json({ token }) }, [200], (res) => res.json() as Promise<InvitePreview>);
}

export async function joinInvite(token: string): Promise<Result<Bucket>> {
  const r = await call('/invites/join', { method: 'POST', ...json({ token }) }, [200], (res) => res.json() as Promise<Bucket>);
  if (r.ok) changed();
  return r;
}

// ---- Invite links ----
// The token travels after "#" so it never reaches a web server or its logs. A person may also paste only the code.

export const INVITE_HOST = 'dl.20-255-48-53.sslip.io';

export function inviteLink(token: string): string {
  return `https://${INVITE_HOST}/join#${token}`;
}

export function inviteShareText(bucketName: string, token: string): string {
  return t('bk.shareText', { name: bucketName, link: inviteLink(token) });
}

// The code out of whatever was pasted or opened: a full link, "join#CODE", or the bare code.
export function tokenFromText(text: string): string | null {
  const m = text.match(/#([A-Za-z0-9-]{8,})\s*$/);
  const raw = (m ? m[1] : text).replace(/[\s-]/g, '').toUpperCase();
  return /^[A-Z2-7]{20,40}$/.test(raw) ? raw : null;
}

// A link that was opened before the person was signed in is kept here until the join screen picks it up.
let pending: string | null = null;
const pendingListeners = new Set<() => void>();

export function setPendingInvite(token: string | null) {
  pending = token;
  pendingListeners.forEach((l) => l());
}

export function usePendingInvite(): string | null {
  return useSyncExternalStore(
    (l) => {
      pendingListeners.add(l);
      return () => {
        pendingListeners.delete(l);
      };
    },
    () => pending,
    () => pending,
  );
}
