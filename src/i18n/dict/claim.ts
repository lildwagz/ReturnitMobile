export const claim = {
  // The button on the purchase detail and the sheet it opens.
  'claim.button': { id: 'Buat paket klaim', en: 'Make a claim package', ar: 'إنشاء ملف المطالبة' },
  'claim.sheetTitle': { id: 'Paket klaim', en: 'Claim package', ar: 'ملف المطالبة' },
  'claim.intro': {
    id: 'PDF berisi data pembelian dan foto struk untuk diberikan ke toko atau pusat servis. PDF dibuat di HP Anda dan tidak diunggah ke mana pun.',
    en: 'A PDF with the purchase details and receipt photos to give to the shop or service centre. It is made on your phone and not uploaded anywhere.',
    ar: 'ملف PDF يضم بيانات الشراء وصور الإيصالات لتقديمه إلى المتجر أو مركز الصيانة. يُنشأ على هاتفك ولا يُرفع إلى أي مكان.',
  },
  'claim.includePrice': { id: 'Sertakan harga', en: 'Include the price', ar: 'تضمين السعر' },
  'claim.includeNotes': { id: 'Sertakan catatan', en: 'Include the notes', ar: 'تضمين الملاحظات' },
  'claim.includePhotos': { id: 'Sertakan foto struk', en: 'Include receipt photos', ar: 'تضمين صور الإيصالات' },
  'claim.make': { id: 'Buat PDF', en: 'Make PDF', ar: 'إنشاء PDF' },
  'claim.stepReceipt': {
    id: 'Mengambil struk {n} dari {total}…',
    en: 'Getting receipt {n} of {total}…',
    ar: 'جارٍ جلب الإيصال {n} من {total}…',
  },
  'claim.stepBuild': { id: 'Menyusun PDF…', en: 'Building the PDF…', ar: 'جارٍ إعداد ملف PDF…' },
  'claim.previewTitle': { id: 'Pratinjau PDF', en: 'PDF preview', ar: 'معاينة ملف PDF' },
  'claim.share': { id: 'Bagikan', en: 'Share', ar: 'مشاركة' },
  'claim.previewFailed': {
    id: 'PDF dibuat, tapi tidak bisa ditampilkan di sini. Anda tetap bisa membagikannya.',
    en: 'The PDF was made but cannot be shown here. You can still share it.',
    ar: 'تم إنشاء الملف لكن تعذّر عرضه هنا. يمكنك مشاركته مع ذلك.',
  },
  'claim.shareFailed': { id: 'Tidak bisa membuka menu bagikan.', en: 'Could not open the share menu.', ar: 'تعذّر فتح قائمة المشاركة.' },
  'claim.receiptFailed': {
    id: 'Struk {n} tidak bisa diambil.',
    en: 'Receipt {n} could not be fetched.',
    ar: 'تعذّر جلب الإيصال {n}.',
  },
  'claim.skipReceipt': { id: 'Buat tanpa struk itu', en: 'Make it without that receipt', ar: 'إنشاء الملف بدون هذا الإيصال' },
  'claim.failed': { id: 'Tidak bisa membuat PDF.', en: 'The PDF could not be made.', ar: 'تعذّر إنشاء ملف PDF.' },
  'claim.noSharing': {
    id: 'Perangkat ini tidak bisa membagikan berkas.',
    en: 'This device cannot share files.',
    ar: 'لا يستطيع هذا الجهاز مشاركة الملفات.',
  },
  'claim.dialogTitle': { id: 'Bagikan paket klaim', en: 'Share the claim package', ar: 'مشاركة ملف المطالبة' },
  'claim.skippedBig': {
    id: '{n} struk dilewati karena terlalu besar.',
    en: '{n} receipt(s) left out because they are too large.',
    ar: 'تم تخطي {n} إيصال لكبر حجمه.',
  },

  // Texts inside the PDF itself.
  'claim.pdfTitle': { id: 'Paket klaim garansi', en: 'Warranty claim package', ar: 'ملف مطالبة الضمان' },
  'claim.pdfGenerated': { id: 'Dibuat {date}', en: 'Created {date}', ar: 'أُنشئ في {date}' },
  'claim.pdfActive': { id: 'Garansi aktif sampai {date}', en: 'Warranty active until {date}', ar: 'الضمان ساري حتى {date}' },
  'claim.pdfEnded': { id: 'Garansi berakhir {date}', en: 'Warranty ended {date}', ar: 'انتهى الضمان في {date}' },
  'claim.pdfUnknown': { id: 'Masa garansi tidak diisi', en: 'No warranty period entered', ar: 'لم تُدخل مدة الضمان' },
  'claim.pdfReturn': { id: 'Batas pengembalian {date}', en: 'Return deadline {date}', ar: 'آخر موعد للإرجاع {date}' },
  'claim.pdfProduct': { id: 'Data produk', en: 'Product details', ar: 'بيانات المنتج' },
  'claim.pdfStart': { id: 'Mulai garansi', en: 'Warranty start', ar: 'بداية الضمان' },
  'claim.pdfNotes': { id: 'Catatan', en: 'Notes', ar: 'ملاحظات' },
  'claim.pdfReceipts': { id: 'Bukti pembelian', en: 'Proof of purchase', ar: 'إثبات الشراء' },
  'claim.pdfReceiptCaption': {
    id: 'Struk {n} dari {total}: {name}',
    en: 'Receipt {n} of {total}: {name}',
    ar: 'الإيصال {n} من {total}: {name}',
  },
  'claim.pdfSeparate': {
    id: 'Struk PDF terlampir terpisah: {name}',
    en: 'PDF receipt attached separately: {name}',
    ar: 'إيصال PDF مرفق بشكل منفصل: {name}',
  },
  'claim.pdfFooter': {
    id: 'Dibuat dari ReturnIt. Ringkasan data yang dimasukkan pemilik, bukan dokumen resmi toko.',
    en: 'Made with ReturnIt. A summary of what the owner entered, not an official document from the shop.',
    ar: 'أُنشئ بواسطة ReturnIt. ملخص لما أدخله المالك، وليس مستندًا رسميًا من المتجر.',
  },
} as const;
