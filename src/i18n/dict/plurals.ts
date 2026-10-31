import type { Forms } from '@/i18n/dictionary';

type Texts = { id: Forms; en: Forms; ar: Forms };

// {n} is the count. The type annotation keeps the keys literal for tn().
export const pluralTexts = {
  daysLeft: {
    id: { other: '{n} hari lagi' },
    en: { one: '{n} day left', other: '{n} days left' },
    ar: {
      zero: '{n} يوم متبقٍ',
      one: 'يوم واحد متبقٍ',
      two: 'يومان متبقيان',
      few: '{n} أيام متبقية',
      many: '{n} يومًا متبقيًا',
      other: '{n} يوم متبقٍ',
    },
  },
  endedDaysAgo: {
    id: { other: 'Berakhir {n} hari lalu' },
    en: { one: 'Ended {n} day ago', other: 'Ended {n} days ago' },
    ar: {
      zero: 'انتهى منذ {n} يوم',
      one: 'انتهى منذ يوم واحد',
      two: 'انتهى منذ يومين',
      few: 'انتهى منذ {n} أيام',
      many: 'انتهى منذ {n} يومًا',
      other: 'انتهى منذ {n} يوم',
    },
  },
  returnDaysLeft: {
    id: { other: 'Batas pengembalian: {n} hari lagi' },
    en: { one: 'Return deadline: {n} day left', other: 'Return deadline: {n} days left' },
    ar: {
      zero: 'آخر موعد للإرجاع: {n} يوم متبقٍ',
      one: 'آخر موعد للإرجاع: يوم واحد متبقٍ',
      two: 'آخر موعد للإرجاع: يومان متبقيان',
      few: 'آخر موعد للإرجاع: {n} أيام متبقية',
      many: 'آخر موعد للإرجاع: {n} يومًا متبقيًا',
      other: 'آخر موعد للإرجاع: {n} يوم متبقٍ',
    },
  },
  months: {
    id: { other: '{n} bulan' },
    en: { one: '{n} month', other: '{n} months' },
    ar: { zero: '{n} شهر', one: 'شهر واحد', two: 'شهران', few: '{n} أشهر', many: '{n} شهرًا', other: '{n} شهر' },
  },
  days: {
    id: { other: '{n} hari' },
    en: { one: '{n} day', other: '{n} days' },
    ar: { zero: '{n} يوم', one: 'يوم واحد', two: 'يومان', few: '{n} أيام', many: '{n} يومًا', other: '{n} يوم' },
  },
  receipts: {
    id: { other: '{n} struk' },
    en: { one: '{n} receipt', other: '{n} receipts' },
    ar: { zero: '{n} إيصال', one: 'إيصال واحد', two: 'إيصالان', few: '{n} إيصالات', many: '{n} إيصالًا', other: '{n} إيصال' },
  },
  records: {
    id: { other: '{n} catatan' },
    en: { one: '{n} record', other: '{n} records' },
    ar: { zero: '{n} سجل', one: 'سجل واحد', two: 'سجلان', few: '{n} سجلات', many: '{n} سجلًا', other: '{n} سجل' },
  },
  daysBefore: {
    id: { other: '{n} hari sebelumnya' },
    en: { one: '{n} day before', other: '{n} days before' },
    ar: { zero: 'قبل {n} يوم', one: 'قبل يوم واحد', two: 'قبل يومين', few: 'قبل {n} أيام', many: 'قبل {n} يومًا', other: 'قبل {n} يوم' },
  },
  // The part after the date: " · 3 days left".
  suffixLeft: {
    id: { other: ' · {n} hari lagi' },
    en: { one: ' · {n} day left', other: ' · {n} days left' },
    ar: {
      zero: ' · {n} يوم متبقٍ',
      one: ' · يوم واحد متبقٍ',
      two: ' · يومان متبقيان',
      few: ' · {n} أيام متبقية',
      many: ' · {n} يومًا متبقيًا',
      other: ' · {n} يوم متبقٍ',
    },
  },
  suffixEnded: {
    id: { other: ' · berakhir {n} hari lalu' },
    en: { one: ' · ended {n} day ago', other: ' · ended {n} days ago' },
    ar: {
      zero: ' · انتهى منذ {n} يوم',
      one: ' · انتهى منذ يوم واحد',
      two: ' · انتهى منذ يومين',
      few: ' · انتهى منذ {n} أيام',
      many: ' · انتهى منذ {n} يومًا',
      other: ' · انتهى منذ {n} يوم',
    },
  },
  minutesAgo: {
    id: { other: '{n} menit lalu' },
    en: { one: '{n} minute ago', other: '{n} minutes ago' },
    ar: {
      zero: 'أقل من دقيقة',
      one: 'منذ دقيقة واحدة',
      two: 'منذ دقيقتين',
      few: 'منذ {n} دقائق',
      many: 'منذ {n} دقيقة',
      other: 'منذ {n} دقيقة',
    },
  },
  hoursAgo: {
    id: { other: '{n} jam lalu' },
    en: { one: '{n} hour ago', other: '{n} hours ago' },
    ar: {
      zero: 'أقل من ساعة',
      one: 'منذ ساعة واحدة',
      two: 'منذ ساعتين',
      few: 'منذ {n} ساعات',
      many: 'منذ {n} ساعة',
      other: 'منذ {n} ساعة',
    },
  },
} satisfies Record<string, Texts>;
