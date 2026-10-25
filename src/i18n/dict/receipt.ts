export const receiptDict = {
  // app-lock.ts, push.ts
  'lock.setupFirst': {
    id: 'Atur kunci layar (PIN, pola, atau sidik jari) di pengaturan HP dulu, lalu coba lagi.',
    en: 'Set up a screen lock (PIN, pattern or fingerprint) in the phone settings first, then try again.',
    ar: 'اضبط قفل الشاشة (رمز PIN أو نمط أو بصمة) من إعدادات الهاتف أولًا ثم حاول مرة أخرى.',
  },
  'lock.confirmOn': {
    id: 'Konfirmasi untuk mengaktifkan kunci aplikasi',
    en: 'Confirm to turn on the app lock',
    ar: 'أكّد لتفعيل قفل التطبيق',
  },
  'lock.confirmOff': {
    id: 'Konfirmasi untuk mematikan kunci aplikasi',
    en: 'Confirm to turn off the app lock',
    ar: 'أكّد لإيقاف قفل التطبيق',
  },
  'lock.cannotVerify': {
    id: 'Tidak dapat memastikan identitas Anda, jadi pengaturan tidak diubah.',
    en: 'Could not verify it is you, so the setting was not changed.',
    ar: 'تعذّر التحقق من هويتك، لذلك لم يتغيّر الإعداد.',
  },
  'lock.cannotSave': { id: 'Pengaturan tidak dapat disimpan.', en: 'The setting could not be saved.', ar: 'تعذّر حفظ الإعداد.' },
  'lock.openPrompt': { id: 'Buka ReturnIt', en: 'Open ReturnIt', ar: 'فتح ReturnIt' },
  'push.channel': { id: 'Pengingat garansi', en: 'Warranty reminders', ar: 'تذكيرات الضمان' },

  // snooze sheet
  'snooze.title': { id: 'Ingatkan lagi', en: 'Remind me again', ar: 'ذكّرني مرة أخرى' },
  'snooze.tomorrow': { id: 'Besok pukul 09.00', en: 'Tomorrow at 09:00', ar: 'غدًا الساعة 09:00' },
  'snooze.in_3_days': { id: '3 hari lagi', en: 'In 3 days', ar: 'بعد 3 أيام' },
  'snooze.next_week': { id: 'Minggu depan', en: 'Next week', ar: 'الأسبوع القادم' },

  // receipt section
  'rs.cannotOpen': { id: 'Tidak dapat membuka struk.', en: 'Could not open the receipt.', ar: 'تعذّر فتح الإيصال.' },
  'rs.savedRetryUpload': {
    id: '{error} Catatan tetap tersimpan, coba unggah lagi.',
    en: '{error} The record is still saved, try uploading again.',
    ar: '{error} السجل محفوظ، حاول الرفع مرة أخرى.',
  },
  'rs.removeTitle': { id: 'Hapus struk?', en: 'Remove the receipt?', ar: 'حذف الإيصال؟' },
  'rs.removeBody': {
    id: 'File struk akan dihapus permanen.',
    en: 'The receipt file will be deleted permanently.',
    ar: 'سيُحذف ملف الإيصال نهائيًا.',
  },
  'rs.remove': { id: 'Hapus', en: 'Delete', ar: 'حذف' },
  'rs.title': { id: 'Struk pembelian', en: 'Purchase receipt', ar: 'إيصال الشراء' },
  'rs.none': { id: 'Belum ada struk terlampir', en: 'No receipt attached yet', ar: 'لا يوجد إيصال مرفق بعد' },
  'rs.add': { id: 'Tambah', en: 'Add', ar: 'إضافة' },
  'rs.previewFailed': { id: 'Pratinjau gagal dimuat.', en: 'The preview failed to load.', ar: 'تعذّر تحميل المعاينة.' },
  'rs.retry': { id: 'Coba lagi', en: 'Try again', ar: 'حاول مرة أخرى' },
  'rs.pdfPage': { id: 'Halaman {page} dari {pages}', en: 'Page {page} of {pages}', ar: 'الصفحة {page} من {pages}' },
  'rs.pdfFailed': { id: 'Pratinjau PDF gagal dimuat.', en: 'The PDF preview failed to load.', ar: 'تعذّر تحميل معاينة PDF.' },
  'rs.pdfDownload': { id: 'Unduh PDF (cadangan)', en: 'Download PDF (fallback)', ar: 'تنزيل PDF (بديل)' },
  'rs.replace': { id: 'Ganti struk', en: 'Replace receipt', ar: 'استبدال الإيصال' },
  'rs.newPhoto': { id: 'Ambil foto baru', en: 'Take a new photo', ar: 'التقاط صورة جديدة' },
  'rs.removeReceipt': { id: 'Hapus struk', en: 'Delete receipt', ar: 'حذف الإيصال' },
  'rs.takePhoto': { id: 'Ambil foto', en: 'Take a photo', ar: 'التقاط صورة' },
  'rs.openSettings': { id: 'Buka pengaturan aplikasi', en: 'Open app settings', ar: 'فتح إعدادات التطبيق' },
} as const;
