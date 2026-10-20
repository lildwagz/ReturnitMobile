export type WarrantyStatus = 'active' | 'expiring' | 'expired' | 'unknown';

const EXPIRING_DAYS = 30;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

// Days since a fixed point, using UTC math on plain dates so time zones and
// daylight saving never shift the result.
function dayNumber(s: string) {
  const { y, m, d } = parseDate(s);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function todayLocal(): string {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

// Adds N calendar months. If the day does not exist in the target month it is
// clamped to the month's last day (31 Jan + 1 month = 28/29 Feb).
export function addMonths(dateStr: string, months: number): string {
  const { y, m, d } = parseDate(dateStr);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${pad(nm)}-${pad(Math.min(d, lastDay))}`;
}

// Whole days from today until the end date (negative once it has passed).
// The warranty counts as valid through the end date itself.
export function daysLeft(endDate: string | null | undefined, today = todayLocal()): number | null {
  if (!endDate) return null;
  return dayNumber(endDate) - dayNumber(today);
}

export function warrantyStatus(endDate: string | null | undefined, today = todayLocal()): WarrantyStatus {
  const left = daysLeft(endDate, today);
  if (left === null) return 'unknown';
  if (left < 0) return 'expired';
  if (left <= EXPIRING_DAYS) return 'expiring';
  return 'active';
}

export const STATUS_LABEL: Record<WarrantyStatus, string> = {
  active: 'Aktif',
  expiring: 'Segera Berakhir',
  expired: 'Kedaluwarsa',
  unknown: 'Tidak Diketahui',
};

export function formatIDR(price: number | null | undefined, currency = 'IDR'): string {
  if (price === null || price === undefined) return '-';
  const digits = Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (currency === 'IDR' ? 'Rp ' : currency + ' ') + digits;
}