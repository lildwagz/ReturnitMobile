import type { FeatherName } from '@/components/icon';
import { t } from '@/i18n';

// The fixed list of purchase categories. The keys are the ones the server accepts (migration 12 on the backend);
// the names and the suggested warranty months are the app's. `months` is only a suggestion for the form.
export type CategoryKey =
  | 'phone'
  | 'computer'
  | 'tv_audio'
  | 'camera'
  | 'appliance'
  | 'kitchen'
  | 'vehicle'
  | 'tools'
  | 'furniture'
  | 'wearable'
  | 'other';

export type Category = { key: CategoryKey; icon: FeatherName; months: number | null; label: () => string };

export const CATEGORIES: Category[] = [
  { key: 'phone', icon: 'smartphone', months: 12, label: () => t('cat.phone') },
  { key: 'computer', icon: 'monitor', months: 12, label: () => t('cat.computer') },
  { key: 'tv_audio', icon: 'tv', months: 12, label: () => t('cat.tv_audio') },
  { key: 'camera', icon: 'camera', months: 12, label: () => t('cat.camera') },
  { key: 'appliance', icon: 'home', months: 24, label: () => t('cat.appliance') },
  { key: 'kitchen', icon: 'coffee', months: 12, label: () => t('cat.kitchen') },
  { key: 'vehicle', icon: 'truck', months: null, label: () => t('cat.vehicle') },
  { key: 'tools', icon: 'tool', months: 12, label: () => t('cat.tools') },
  { key: 'furniture', icon: 'box', months: 12, label: () => t('cat.furniture') },
  { key: 'wearable', icon: 'watch', months: 12, label: () => t('cat.wearable') },
  { key: 'other', icon: 'package', months: null, label: () => t('cat.other') },
];

// A key from the server that this app version does not know (a category added later) gives undefined: show nothing.
export function findCategory(key: string | null | undefined): Category | undefined {
  return key ? CATEGORIES.find((c) => c.key === key) : undefined;
}
