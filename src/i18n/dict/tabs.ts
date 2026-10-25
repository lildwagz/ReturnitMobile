export const tabs = {
  // Home
  'home.coveredValue': { id: 'Nilai barang yang masih bergaransi', en: 'Value of items still under warranty', ar: 'قيمة المنتجات التي لا تزال تحت الضمان' },
  'home.today': { id: 'hari ini', en: 'today', ar: 'اليوم' },
  'home.nextExpiring': { id: 'Garansi berakhir berikutnya', en: 'Next warranty to end', ar: 'أقرب ضمان سينتهي' },
  'home.nextReturn': { id: 'Batas pengembalian terdekat', en: 'Nearest return deadline', ar: 'أقرب موعد للإرجاع' },
  'home.hello': { id: 'Halo, selamat datang 👋', en: 'Hello, welcome 👋', ar: 'مرحبًا بك 👋' },
  'home.tagline': {
    id: 'Semua bukti pembelian dan garansi dalam satu tempat.',
    en: 'All your proof of purchase and warranties in one place.',
    ar: 'كل إثباتات الشراء والضمانات في مكان واحد.',
  },
  'home.add': { id: '＋ Tambah Pembelian', en: '＋ Add purchase', ar: '＋ إضافة شراء' },
  'home.retry': { id: 'Coba lagi', en: 'Try again', ar: 'حاول مرة أخرى' },
  'home.active': { id: 'Garansi aktif', en: 'Active warranties', ar: 'ضمانات سارية' },
  'home.expiring': { id: 'Segera berakhir', en: 'Ending soon', ar: 'تنتهي قريبًا' },
  'home.total': { id: 'Total pembelian', en: 'Total purchases', ar: 'إجمالي المشتريات' },
  'home.recent': { id: 'Pembelian terbaru', en: 'Recent purchases', ar: 'أحدث المشتريات' },
  'home.seeAll': { id: 'Lihat semua →', en: 'See all →', ar: 'عرض الكل ←' },
  'empty.noPurchases': { id: 'Belum ada pembelian', en: 'No purchases yet', ar: 'لا توجد مشتريات بعد' },
  'empty.addFirst': { id: 'Tambahkan pembelian pertama Anda.', en: 'Add your first purchase.', ar: 'أضف أول عملية شراء.' },

  // Purchases list
  'list.all': { id: 'Semua', en: 'All', ar: 'الكل' },
  'list.title': { id: 'Pembelian Saya', en: 'My purchases', ar: 'مشترياتي' },
  'list.subtitle': {
    id: 'Cari produk dan cek status garansinya.',
    en: 'Find a product and check its warranty status.',
    ar: 'ابحث عن منتج وتحقّق من حالة ضمانه.',
  },
  'list.search': { id: 'Cari nama produk atau toko', en: 'Search product or store name', ar: 'ابحث باسم المنتج أو المتجر' },
  'list.loadMoreFailed': { id: 'Gagal memuat data berikutnya.', en: 'Could not load more.', ar: 'تعذّر تحميل المزيد.' },
  'list.noResults': { id: 'Tidak ada hasil', en: 'No results', ar: 'لا توجد نتائج' },
  'list.noResultsHelp': {
    id: 'Coba kata kunci atau filter yang berbeda.',
    en: 'Try a different keyword or filter.',
    ar: 'جرّب كلمة بحث أو عامل تصفية مختلفًا.',
  },
} as const;
