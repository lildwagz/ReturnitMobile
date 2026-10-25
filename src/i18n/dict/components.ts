export const components = {
  // tabs
  'tab.home': { id: 'Home', en: 'Home', ar: 'الرئيسية' },
  'tab.purchases': { id: 'Pembelian', en: 'Purchases', ar: 'المشتريات' },
  'tab.reminders': { id: 'Pengingat', en: 'Reminders', ar: 'التذكيرات' },
  'tab.settings': { id: 'Pengaturan', en: 'Settings', ar: 'الإعدادات' },

  // lock screen
  'lock.notEnrolled': {
    id: 'Kunci layar HP tidak aktif lagi. Aktifkan kembali di pengaturan HP, atau keluar dari akun.',
    en: 'The phone screen lock is no longer set. Turn it on again in the phone settings, or sign out.',
    ar: 'قفل شاشة الهاتف لم يعد مفعّلًا. فعّله من إعدادات الهاتف أو سجّل الخروج.',
  },
  'lock.lockout': {
    id: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
    en: 'Too many attempts. Wait a moment and try again.',
    ar: 'محاولات كثيرة جدًا. انتظر قليلًا ثم حاول مرة أخرى.',
  },
  'lock.failed': { id: 'Tidak dapat membuka kunci. Coba lagi.', en: 'Could not unlock. Try again.', ar: 'تعذّر فتح القفل. حاول مرة أخرى.' },
  'lock.title': { id: 'ReturnIt terkunci', en: 'ReturnIt is locked', ar: 'ReturnIt مقفل' },
  'lock.hint': {
    id: 'Gunakan sidik jari, wajah, atau PIN HP untuk membuka.',
    en: 'Use your fingerprint, face or phone PIN to open it.',
    ar: 'استخدم بصمة الإصبع أو الوجه أو رمز PIN الخاص بالهاتف لفتحه.',
  },
  'lock.checking': { id: 'Memeriksa…', en: 'Checking…', ar: 'جارٍ التحقق…' },
  'lock.unlock': { id: 'Buka kunci', en: 'Unlock', ar: 'فتح القفل' },
  'lock.signOut': { id: 'Keluar dari akun', en: 'Sign out', ar: 'تسجيل الخروج' },

  // login gate
  'login.intro': {
    id: 'Masuk untuk melihat catatan pembelian dan garansi Anda.',
    en: 'Sign in to see your purchases and warranties.',
    ar: 'سجّل الدخول لعرض مشترياتك وضماناتك.',
  },
  'login.signIn': { id: 'Masuk', en: 'Sign in', ar: 'تسجيل الدخول' },
  'login.google': { id: 'Lanjutkan dengan Google', en: 'Continue with Google', ar: 'المتابعة باستخدام Google' },

  // purchase row
  'row.open': { id: 'Buka detail {name}', en: 'Open details of {name}', ar: 'فتح تفاصيل {name}' },
  'row.returnToday': { id: 'Batas pengembalian hari ini', en: 'Return deadline is today', ar: 'اليوم آخر موعد للإرجاع' },
  'row.chevron': { id: '›', en: '›', ar: '‹' },

  // banners
  'banner.active': { id: 'Garansi masih aktif', en: 'Warranty is active', ar: 'الضمان ساري' },
  'banner.expiring': { id: 'Garansi segera berakhir', en: 'Warranty ends soon', ar: 'الضمان ينتهي قريبًا' },
  'banner.expired': { id: 'Masa garansi telah berakhir', en: 'Warranty has ended', ar: 'انتهى الضمان' },
  'banner.unknown': { id: 'Tanggal garansi belum diketahui', en: 'Warranty date is not known yet', ar: 'تاريخ الضمان غير معروف بعد' },
  'banner.endDate': { id: 'Tanggal akhir: {date}', en: 'End date: {date}', ar: 'تاريخ الانتهاء: {date}' },
  'banner.addDuration': {
    id: 'Tambahkan durasi garansi untuk menghitung tanggal akhir.',
    en: 'Add a warranty duration to work out the end date.',
    ar: 'أضف مدة الضمان لحساب تاريخ الانتهاء.',
  },
  'banner.returnPassed': { id: 'Batas pengembalian sudah lewat', en: 'The return deadline has passed', ar: 'انتهى آخر موعد للإرجاع' },
  'banner.returnToday': { id: 'Batas pengembalian hari ini', en: 'Return deadline is today', ar: 'اليوم آخر موعد للإرجاع' },
  'banner.return': { id: 'Batas pengembalian', en: 'Return deadline', ar: 'آخر موعد للإرجاع' },

  // update banner / gate
  'update.available': { id: 'Versi {version} tersedia', en: 'Version {version} is available', ar: 'الإصدار {version} متاح' },
  'update.newest': { id: 'terbaru', en: 'latest', ar: 'الأحدث' },
  'update.defaultMessage': {
    id: 'Perbarui untuk mendapatkan perbaikan dan fitur terbaru.',
    en: 'Update to get the latest fixes and features.',
    ar: 'حدّث التطبيق للحصول على أحدث الإصلاحات والميزات.',
  },
  'update.update': { id: 'Perbarui', en: 'Update', ar: 'تحديث' },
  'update.later': { id: 'Nanti', en: 'Later', ar: 'لاحقًا' },
  'gate.openFailed': {
    id: 'Tidak dapat membuka halaman unduhan. Salin alamatnya: {url}',
    en: 'Could not open the download page. Copy the address: {url}',
    ar: 'تعذّر فتح صفحة التنزيل. انسخ العنوان: {url}',
  },
  'gate.maintenanceTitle': { id: 'Sedang dalam perbaikan', en: 'Under maintenance', ar: 'قيد الصيانة' },
  'gate.updateTitle': { id: 'Perbarui aplikasi', en: 'Update the app', ar: 'حدّث التطبيق' },
  'gate.maintenanceBody': {
    id: 'ReturnIt sedang dalam perbaikan. Coba lagi beberapa saat lagi.',
    en: 'ReturnIt is under maintenance. Try again in a little while.',
    ar: 'ReturnIt قيد الصيانة. حاول مرة أخرى بعد قليل.',
  },
  'gate.updateBody': {
    id: 'Versi aplikasi ini sudah tidak didukung. Perbarui ke versi terbaru untuk melanjutkan.',
    en: 'This version of the app is no longer supported. Update to the latest version to continue.',
    ar: 'لم يعد هذا الإصدار من التطبيق مدعومًا. حدّث إلى أحدث إصدار للمتابعة.',
  },
  'gate.version': { id: 'Versi Anda: {version}', en: 'Your version: {version}', ar: 'إصدارك: {version}' },
  'gate.minimum': { id: ' · minimum: {version}', en: ' · minimum: {version}', ar: ' · الحد الأدنى: {version}' },
  'gate.updateNow': { id: 'Perbarui sekarang', en: 'Update now', ar: 'حدّث الآن' },
  'gate.retry': { id: 'Coba lagi', en: 'Try again', ar: 'حاول مرة أخرى' },
  'gate.updated': { id: 'Saya sudah memperbarui', en: 'I have updated', ar: 'لقد حدّثت التطبيق' },
} as const;
