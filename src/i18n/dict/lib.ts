export const lib = {
  // receipt.ts
  'receipt.tooBig': { id: 'Ukuran file melebihi 10 MB.', en: 'The file is larger than 10 MB.', ar: 'حجم الملف أكبر من 10 ميغابايت.' },
  'receipt.badType': {
    id: 'Jenis file tidak didukung. Gunakan PDF, JPEG atau PNG.',
    en: 'This file type is not supported. Use PDF, JPEG or PNG.',
    ar: 'نوع الملف غير مدعوم. استخدم PDF أو JPEG أو PNG.',
  },
  'receipt.infected': {
    id: 'File ditolak karena terdeteksi berbahaya.',
    en: 'The file was rejected because it looks harmful.',
    ar: 'تم رفض الملف لأنه يبدو ضارًا.',
  },
  'receipt.scannerDown': {
    id: 'Pemindai keamanan sedang tidak tersedia. Coba lagi nanti.',
    en: 'The security scanner is not available right now. Try again later.',
    ar: 'ماسح الأمان غير متاح حاليًا. حاول لاحقًا.',
  },
  'receipt.pickerFailed': { id: 'Tidak dapat membuka pemilih file.', en: 'Could not open the file picker.', ar: 'تعذّر فتح أداة اختيار الملفات.' },
  'receipt.cameraPermFailed': { id: 'Tidak dapat meminta izin kamera.', en: 'Could not ask for camera permission.', ar: 'تعذّر طلب إذن الكاميرا.' },
  'receipt.cameraNeeded': {
    id: 'Izin kamera diperlukan untuk mengambil foto struk.',
    en: 'Camera permission is needed to photograph a receipt.',
    ar: 'إذن الكاميرا مطلوب لتصوير الإيصال.',
  },
  'receipt.cameraFailed': { id: 'Tidak dapat membuka kamera.', en: 'Could not open the camera.', ar: 'تعذّر فتح الكاميرا.' },
  'receipt.photoName': { id: 'foto-struk.jpg', en: 'receipt-photo.jpg', ar: 'receipt-photo.jpg' },

  // use-account.ts
  'account.reauth': {
    id: 'Untuk keamanan, masuk sekali lagi untuk melanjutkan.',
    en: 'For your security, sign in once more to continue.',
    ar: 'لأمانك، سجّل الدخول مرة أخرى للمتابعة.',
  },
  'account.reauthFailed': {
    id: 'Masuk ulang tidak selesai, jadi penghapusan dibatalkan.',
    en: 'Signing in again was not completed, so the deletion was cancelled.',
    ar: 'لم يكتمل تسجيل الدخول مجددًا، لذلك أُلغي الحذف.',
  },
  'account.loginNotFresh': {
    id: 'Login belum cukup baru. Coba lagi.',
    en: 'Your sign-in is not recent enough. Try again.',
    ar: 'تسجيل الدخول ليس حديثًا بما يكفي. حاول مرة أخرى.',
  },
  'account.deleteTitle': { id: 'Hapus akun?', en: 'Delete account?', ar: 'حذف الحساب؟' },
  'account.deleteBody': {
    id: 'Akun dijadwalkan terhapus permanen setelah masa tunggu (biasanya 7 hari). Selama masa tunggu Anda dapat membatalkan. Setelah itu, semua pembelian, struk, dan pengingat hilang dan tidak dapat dipulihkan.',
    en: 'Your account will be deleted permanently after a waiting period (usually 7 days). You can cancel during that time. After that, all purchases, receipts and reminders are gone and cannot be restored.',
    ar: 'سيُحذف حسابك نهائيًا بعد فترة انتظار (عادةً 7 أيام). يمكنك الإلغاء خلال هذه الفترة. بعد ذلك تُفقد جميع المشتريات والإيصالات والتذكيرات ولا يمكن استعادتها.',
  },
  'account.deleteConfirm': { id: 'Hapus akun', en: 'Delete account', ar: 'حذف الحساب' },
  'account.graceOver': {
    id: 'Masa tunggu sudah berakhir, akun tidak dapat dipulihkan lagi.',
    en: 'The waiting period is over, the account can no longer be restored.',
    ar: 'انتهت فترة الانتظار ولم يعد بالإمكان استعادة الحساب.',
  },

  // auth.ts
  'auth.stateMismatch': {
    id: 'Sesi masuk sebelumnya sudah kedaluwarsa. Tutup tab browser yang masih terbuka, lalu tekan Masuk sekali lagi.',
    en: 'The previous sign-in session has expired. Close any browser tab that is still open, then tap Sign in again.',
    ar: 'انتهت جلسة تسجيل الدخول السابقة. أغلق أي تبويب متصفح لا يزال مفتوحًا ثم اضغط تسجيل الدخول مرة أخرى.',
  },
  'auth.googleFailed': {
    id: 'Tidak dapat masuk dengan Google{why}. Jika e-mail ini sudah punya akun dengan kata sandi, masuk dengan e-mail dan kata sandi, atau pilih Lupa kata sandi di halaman masuk.',
    en: 'Could not sign in with Google{why}. If this e-mail already has an account with a password, sign in with e-mail and password, or choose Forgot password on the sign-in page.',
    ar: 'تعذّر تسجيل الدخول عبر Google{why}. إذا كان لهذا البريد حساب بكلمة مرور، فسجّل الدخول بالبريد وكلمة المرور أو اختر «نسيت كلمة المرور» في صفحة الدخول.',
  },
  'auth.failedWhy': { id: 'Masuk gagal: {why}', en: 'Sign-in failed: {why}', ar: 'فشل تسجيل الدخول: {why}' },
  'auth.failed': {
    id: 'Masuk gagal. Coba lagi, atau hubungi dukungan bila berulang.',
    en: 'Sign-in failed. Try again, or contact support if it keeps happening.',
    ar: 'فشل تسجيل الدخول. حاول مرة أخرى أو تواصل مع الدعم إذا تكرر ذلك.',
  },
  'auth.failedType': { id: 'Masuk gagal ({type}).', en: 'Sign-in failed ({type}).', ar: 'فشل تسجيل الدخول ({type}).' },
  'auth.error': { id: 'Error: {e}', en: 'Error: {e}', ar: 'خطأ: {e}' },
} as const;
