import { daysBetween, todayLocal } from '@/lib/warranty';

// One date of the Tenggat tab: the end of a purchase's warranty or its return deadline (GET /deadlines).
export type DeadlineKind = 'warranty' | 'return';
export type Deadline = { purchaseId: string; productName: string; category: string | null; kind: DeadlineKind; date: string };

export type DeadlineGroup = 'week' | 'month' | 'later' | 'passed';

// The order of the sections on screen. "Passed" (the last 30 days) comes last, most recent first.
export const GROUP_ORDER: DeadlineGroup[] = ['week', 'month', 'later', 'passed'];

// By the phone's local date: within the next 7 days (today included), within 30, later, or already passed.
export function groupOf(date: string, today = todayLocal()): DeadlineGroup {
  const d = daysBetween(today, date);
  if (d < 0) return 'passed';
  if (d <= 7) return 'week';
  if (d <= 30) return 'month';
  return 'later';
}

// The items split into the sections that have any, in GROUP_ORDER. The server sends them soonest first.
export function groupDeadlines(items: Deadline[], today = todayLocal()): { group: DeadlineGroup; data: Deadline[] }[] {
  const buckets: Record<DeadlineGroup, Deadline[]> = { week: [], month: [], later: [], passed: [] };
  for (const item of items) buckets[groupOf(item.date, today)].push(item);
  buckets.passed.reverse();
  return GROUP_ORDER.filter((g) => buckets[g].length > 0).map((g) => ({ group: g, data: buckets[g] }));
}
