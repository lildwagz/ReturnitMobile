export const errors = {
  'error.connection': {
    id: 'Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi.',
    en: 'Cannot reach the server. Check your connection and try again.',
    ar: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك وحاول مرة أخرى.',
  },
  'error.tooManyWait': {
    id: 'Terlalu banyak permintaan. Coba lagi dalam {s} detik.',
    en: 'Too many requests. Try again in {s} seconds.',
    ar: 'طلبات كثيرة جدًا. حاول مرة أخرى بعد {s} ثانية.',
  },
  'error.tooMany': {
    id: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.',
    en: 'Too many requests. Try again in a moment.',
    ar: 'طلبات كثيرة جدًا. حاول مرة أخرى بعد قليل.',
  },
  'error.notFound': { id: 'Catatan tidak ditemukan.', en: 'Record not found.', ar: 'السجل غير موجود.' },
  'error.account': {
    id: 'Akun bermasalah. Hubungi dukungan.',
    en: 'There is a problem with your account. Contact support.',
    ar: 'هناك مشكلة في حسابك. تواصل مع الدعم.',
  },
  'error.failed': { id: 'Gagal: {message}', en: 'Failed: {message}', ar: 'فشل: {message}' },
  'error.generic': {
    id: 'Terjadi kesalahan (kode {code}).',
    en: 'Something went wrong (code {code}).',
    ar: 'حدث خطأ (الرمز {code}).',
  },
} as const;
