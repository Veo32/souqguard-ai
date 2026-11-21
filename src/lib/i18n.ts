/**
 * SouqGuard AI — bilingual dictionary (EN / AR).
 *
 * The key tree below is the CONTRACT for all agents:
 * later agents resolve keys via `t('path.to.key')` from useI18n().
 * Do not rename or remove keys — only add new ones if unavoidable.
 */

export type Locale = 'en' | 'ar'

export interface Dictionary {
  common: {
    appName: string
    appTagline: string
    loading: string
    error: string
    retry: string
    noResults: string
    search: string
    clear: string
    close: string
    details: string
    viewAll: string
    refresh: string
    total: string
    showing: string
  }
  nav: {
    dashboard: string
    visualSearch: string
    compliance: string
    catalog: string
    policies: string
  }
  header: {
    brand: string
    themeLight: string
    themeDark: string
    language: string
    subtitle: string
  }
  hero: {
    badge: string
    title1: string
    title2: string
    subtitle: string
    stat1: string
    stat2: string
    stat3: string
    ctaScan: string
  }
  dashboard: {
    title: string
    subtitle: string
    statTotalListings: string
    statPendingReview: string
    statOpenFlags: string
    statAvgRisk: string
    statComplianceRate: string
    riskDistribution: string
    riskDistributionSub: string
    riskBands: {
      b1: string
      b2: string
      b3: string
      b4: string
      b5: string
    }
    categoryOverview: string
    categoryOverviewSub: string
    recentFlags: string
    recentFlagsSub: string
    runFullScan: string
    scanning: string
    scanComplete: string
    scanSummary: string
    lastScanAt: string
    never: string
    viewAllFlags: string
    topRiskListings: string
    topRiskSub: string
    riskScore: string
    openFlags: string
    listings: string
    criticalFlagsShort: string
  }
  visualSearch: {
    title: string
    subtitle: string
    visualTab: string
    textTab: string
    dropzoneTitle: string
    dropzoneHint: string
    browse: string
    orTrySamples: string
    analyzingImage: string
    textQueryPlaceholder: string
    searchBtn: string
    resultsTitle: string
    resultsCount: string
    similarityScore: string
    whyMatched: string
    noVisualResults: string
    noTextResults: string
    uploadFailed: string
    fileInvalid: string
    sampleCrimson: string
    sampleEmerald: string
    sampleNavy: string
    sampleAmber: string
    sampleRose: string
    sampleTeal: string
    poweredBy: string
  }
  compliance: {
    title: string
    subtitle: string
    allSeverities: string
    allStatuses: string
    severity: string
    status: string
    flagsFound: string
    rule: string
    product: string
    confidence: string
    evidence: string
    detectedAt: string
    resolve: string
    dismiss: string
    resolvedOk: string
    dismissedOk: string
    noFlagsTitle: string
    noFlagsSub: string
    riskAfter: string
    statusAfter: string
    rescan: string
    evidenceKeys: {
      mentionedColors: string
      dominantColors: string
      distance: string
      term: string
      context: string
      categoryAvg: string
      price: string
      ratio: string
      required: string
      matchedCategory: string
      score: string
      meanLuminance: string
      meanSaturation: string
    }
  }
  catalog: {
    title: string
    subtitle: string
    allCategories: string
    allStatuses: string
    category: string
    status: string
    sort: string
    sortNewest: string
    sortRisk: string
    sortPriceLow: string
    sortPriceHigh: string
    price: string
    seller: string
    brand: string
    country: string
    listedOn: string
    riskScore: string
    openFlags: string
    viewListing: string
    noProducts: string
  }
  policies: {
    title: string
    subtitle: string
    ruleCategory: string
    severity: string
    weight: string
    flagsTriggered: string
    openFlags: string
    active: string
    inactive: string
    riskWeight: string
    catContent: string
    catSafety: string
    catAuthenticity: string
    catQuality: string
    catFairPricing: string
    catListingQuality: string
    catRestricted: string
  }
  status: {
    PENDING: string
    APPROVED: string
    NEEDS_REVIEW: string
    REJECTED: string
  }
  flagStatus: {
    OPEN: string
    RESOLVED: string
    DISMISSED: string
  }
  severity: {
    CRITICAL: string
    HIGH: string
    MEDIUM: string
    LOW: string
  }
  category: {
    electronics: string
    fashion: string
    toys: string
    home: string
    beauty: string
    sports: string
    grocery: string
  }
  footer: {
    tagline: string
    dataset: string
    datasetName: string
    rights: string
    tech: string
  }
  toast: {
    scanStarted: string
    scanDone: string
    flagResolved: string
    flagDismissed: string
    searchComplete: string
    loadError: string
  }
  theme: {
    light: string
    dark: string
  }
}

const en: Dictionary = {
  common: {
    appName: 'SouqGuard AI',
    appTagline: 'Visual Search & Policy Compliance Copilot',
    loading: 'Loading…',
    error: 'Something went wrong',
    retry: 'Try again',
    noResults: 'No results found',
    search: 'Search',
    clear: 'Clear',
    close: 'Close',
    details: 'Details',
    viewAll: 'View all',
    refresh: 'Refresh',
    total: 'Total',
    showing: 'Showing {{count}} of {{total}}',
  },
  nav: {
    dashboard: 'Dashboard',
    visualSearch: 'Visual Search',
    compliance: 'Compliance Center',
    catalog: 'Product Catalog',
    policies: 'Policy Rules',
  },
  header: {
    brand: 'SouqGuard AI',
    themeLight: 'Switch to light mode',
    themeDark: 'Switch to dark mode',
    language: 'Change language',
    subtitle: 'حارس السوق',
  },
  hero: {
    badge: 'Multimodal AI Copilot',
    title1: 'Every listing,',
    title2: 'verified in seconds.',
    subtitle:
      'Search your marketplace by image or text, and let AI check every listing against your policy rules — content, safety, authenticity, pricing and more.',
    stat1: '30 live listings',
    stat2: '9 policy rules',
    stat3: 'Bilingual EN / عربي',
    ctaScan: 'Start a Scan',
  },
  dashboard: {
    title: 'Compliance Dashboard',
    subtitle: 'Live overview of marketplace health, risk and policy enforcement.',
    statTotalListings: 'Total Listings',
    statPendingReview: 'Pending Review',
    statOpenFlags: 'Open Flags',
    statAvgRisk: 'Avg. Risk Score',
    statComplianceRate: 'Compliance Rate',
    riskDistribution: 'Risk Distribution',
    riskDistributionSub: 'Listings grouped by risk band',
    riskBands: {
      b1: 'Critical (80–100)',
      b2: 'High (60–79)',
      b3: 'Medium (40–59)',
      b4: 'Low (20–39)',
      b5: 'Minimal (0–19)',
    },
    categoryOverview: 'Category Overview',
    categoryOverviewSub: 'Volume and risk by product category',
    recentFlags: 'Recent Flags',
    recentFlagsSub: 'Latest policy violations detected',
    runFullScan: 'Run Full Scan',
    scanning: 'Scanning…',
    scanComplete: 'Scan complete',
    scanSummary: '{{scanned}} listings scanned · {{flags}} flags raised',
    lastScanAt: 'Last scan',
    never: 'Never',
    viewAllFlags: 'View all flags',
    topRiskListings: 'Top Risk Listings',
    topRiskSub: 'The listings that need attention first',
    riskScore: 'Risk score',
    openFlags: 'Open flags',
    listings: 'listings',
    criticalFlagsShort: '{{count}} critical',
  },
  visualSearch: {
    title: 'Visual Search',
    subtitle: 'Find similar listings from a product image or a text description.',
    visualTab: 'Search by Image',
    textTab: 'Search by Text',
    dropzoneTitle: 'Drag & drop a product image',
    dropzoneHint: 'PNG or JPG, up to 5MB',
    browse: 'Browse files',
    orTrySamples: 'or try a sample image',
    analyzingImage: 'Analyzing image…',
    textQueryPlaceholder: 'e.g. wireless noise-cancelling headphones',
    searchBtn: 'Search',
    resultsTitle: 'Similar listings',
    resultsCount: '{{count}} matches',
    similarityScore: 'Similarity',
    whyMatched: 'Why it matched',
    noVisualResults: 'No similar listings found for this image.',
    noTextResults: 'No listings match your query.',
    uploadFailed: 'Upload failed. Please try again.',
    fileInvalid: 'Please choose a PNG or JPG image under 5MB.',
    sampleCrimson: 'Crimson',
    sampleEmerald: 'Emerald',
    sampleNavy: 'Navy',
    sampleAmber: 'Amber',
    sampleRose: 'Rose',
    sampleTeal: 'Teal',
    poweredBy:
      'Similarity search powered by a 64-dim palette-histogram embedding (color channels + spatial luminance grid), ranked by cosine similarity.',
  },
  compliance: {
    title: 'Compliance Center',
    subtitle: 'Review, resolve and dismiss policy flags across the catalog.',
    allSeverities: 'All severities',
    allStatuses: 'All statuses',
    severity: 'Severity',
    status: 'Status',
    flagsFound: '{{count}} flags found',
    rule: 'Rule',
    product: 'Product',
    confidence: 'Confidence',
    evidence: 'Evidence',
    detectedAt: 'Detected',
    resolve: 'Resolve',
    dismiss: 'Dismiss',
    resolvedOk: 'Flag resolved',
    dismissedOk: 'Flag dismissed',
    noFlagsTitle: 'No flags here',
    noFlagsSub: 'All clear — no listings violate the current filters.',
    riskAfter: 'Risk after',
    statusAfter: 'Status after',
    rescan: 'Rescan listing',
    evidenceKeys: {
      mentionedColors: 'Mentioned colors',
      dominantColors: 'Dominant colors',
      distance: 'Distance',
      term: 'Term',
      context: 'Context',
      categoryAvg: 'Category average',
      price: 'Price',
      ratio: 'Ratio',
      required: 'Required',
      matchedCategory: 'Matched category',
      score: 'Score',
      meanLuminance: 'Mean luminance',
      meanSaturation: 'Mean saturation',
    },
  },
  catalog: {
    title: 'Product Catalog',
    subtitle: 'Browse every listing with its live risk and compliance status.',
    allCategories: 'All categories',
    allStatuses: 'All statuses',
    category: 'Category',
    status: 'Status',
    sort: 'Sort by',
    sortNewest: 'Newest first',
    sortRisk: 'Highest risk',
    sortPriceLow: 'Price: low to high',
    sortPriceHigh: 'Price: high to low',
    price: 'Price',
    seller: 'Seller',
    brand: 'Brand',
    country: 'Country',
    listedOn: 'Listed on',
    riskScore: 'Risk score',
    openFlags: 'Open flags',
    viewListing: 'View listing',
    noProducts: 'No products match your filters.',
  },
  policies: {
    title: 'Policy Rules',
    subtitle: 'The rulebook the compliance engine enforces on every listing.',
    ruleCategory: 'Rule category',
    severity: 'Severity',
    weight: 'Weight',
    flagsTriggered: 'Flags triggered',
    openFlags: 'Open flags',
    active: 'Active',
    inactive: 'Inactive',
    riskWeight: 'Risk weight',
    catContent: 'Content Policy',
    catSafety: 'Safety Policy',
    catAuthenticity: 'Authenticity',
    catQuality: 'Quality',
    catFairPricing: 'Fair Pricing',
    catListingQuality: 'Listing Quality',
    catRestricted: 'Restricted Items',
  },
  status: {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    NEEDS_REVIEW: 'Needs Review',
    REJECTED: 'Rejected',
  },
  flagStatus: {
    OPEN: 'Open',
    RESOLVED: 'Resolved',
    DISMISSED: 'Dismissed',
  },
  severity: {
    CRITICAL: 'Critical',
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
  },
  category: {
    electronics: 'Electronics',
    fashion: 'Fashion',
    toys: 'Toys',
    home: 'Home',
    beauty: 'Beauty',
    sports: 'Sports',
    grocery: 'Grocery',
  },
  footer: {
    tagline: 'The AI copilot for trustworthy marketplaces.',
    dataset: 'Sample data from the',
    datasetName: 'Amazon Reviews 2023 Dataset',
    rights: 'All rights reserved.',
    tech: 'Built with Next.js, Prisma & multimodal AI',
  },
  toast: {
    scanStarted: 'Scan started',
    scanDone: 'Scan completed successfully',
    flagResolved: 'Flag resolved',
    flagDismissed: 'Flag dismissed',
    searchComplete: 'Search complete',
    loadError: 'Failed to load data',
  },
  theme: {
    light: 'Light',
    dark: 'Dark',
  },
}

const ar: Dictionary = {
  common: {
    appName: 'حارس السوق',
    appTagline: 'مساعد البحث المرئي والامتثال للسياسات',
    loading: 'جارٍ التحميل…',
    error: 'حدث خطأ ما',
    retry: 'أعد المحاولة',
    noResults: 'لا توجد نتائج',
    search: 'بحث',
    clear: 'مسح',
    close: 'إغلاق',
    details: 'التفاصيل',
    viewAll: 'عرض الكل',
    refresh: 'تحديث',
    total: 'الإجمالي',
    showing: 'عرض {{count}} من {{total}}',
  },
  nav: {
    dashboard: 'لوحة التحكم',
    visualSearch: 'البحث المرئي',
    compliance: 'مركز الامتثال',
    catalog: 'كتالوج المنتجات',
    policies: 'قواعد السياسات',
  },
  header: {
    brand: 'حارس السوق',
    themeLight: 'التبديل إلى الوضع النهاري',
    themeDark: 'التبديل إلى الوضع الليلي',
    language: 'تغيير اللغة',
    subtitle: 'SouqGuard AI',
  },
  hero: {
    badge: 'مساعد ذكي متعدد الوسائط',
    title1: 'كل إعلان،',
    title2: 'يُدقَّق في ثوانٍ.',
    subtitle:
      'ابحث في سوقك بالصورة أو بالنص، ودَع الذكاء الاصطناعي يتحقق من كل إعلان وفق قواعد سياساتك — المحتوى والسلامة والأصالة والتسعير وغيرها.',
    stat1: '30 إعلاناً نشطاً',
    stat2: '9 قواعد سياسات',
    stat3: 'ثنائي اللغة عربي / EN',
    ctaScan: 'ابدأ الفحص',
  },
  dashboard: {
    title: 'لوحة تحكم الامتثال',
    subtitle: 'نظرة حيّة على صحة السوق والمخاطر وإنفاذ السياسات.',
    statTotalListings: 'إجمالي الإعلانات',
    statPendingReview: 'قيد المراجعة',
    statOpenFlags: 'إشارات مفتوحة',
    statAvgRisk: 'متوسط درجة المخاطر',
    statComplianceRate: 'نسبة الامتثال',
    riskDistribution: 'توزيع المخاطر',
    riskDistributionSub: 'الإعلانات مجمّعة حسب نطاق المخاطر',
    riskBands: {
      b1: 'حرج (80–100)',
      b2: 'مرتفع (60–79)',
      b3: 'متوسط (40–59)',
      b4: 'منخفض (20–39)',
      b5: 'ضئيل (0–19)',
    },
    categoryOverview: 'نظرة عامة على الفئات',
    categoryOverviewSub: 'الحجم والمخاطر حسب فئة المنتج',
    recentFlags: 'أحدث الإشارات',
    recentFlagsSub: 'أحدث مخالفات السياسات المكتشفة',
    runFullScan: 'تشغيل الفحص الكامل',
    scanning: 'جارٍ الفحص…',
    scanComplete: 'اكتمل الفحص',
    scanSummary: 'تم فحص {{scanned}} إعلاناً · رُفعت {{flags}} من الإشارات',
    lastScanAt: 'آخر فحص',
    never: 'لم يُجرَ بعد',
    viewAllFlags: 'عرض جميع الإشارات',
    topRiskListings: 'الإعلانات الأعلى مخاطر',
    topRiskSub: 'الإعلانات التي تستدعي الانتباه أولاً',
    riskScore: 'درجة المخاطر',
    openFlags: 'إشارات مفتوحة',
    listings: 'من الإعلانات',
    criticalFlagsShort: '{{count}} حرجة',
  },
  visualSearch: {
    title: 'البحث المرئي',
    subtitle: 'اعثر على إعلانات مشابهة من صورة منتج أو وصف نصي.',
    visualTab: 'بحث بالصورة',
    textTab: 'بحث بالنص',
    dropzoneTitle: 'اسحب صورة المنتج وأفلتها هنا',
    dropzoneHint: 'بصيغة PNG أو JPG وبحجم أقصى 5 ميغابايت',
    browse: 'استعراض الملفات',
    orTrySamples: 'أو جرّب صورة نموذجية',
    analyzingImage: 'جارٍ تحليل الصورة…',
    textQueryPlaceholder: 'مثال: سماعات لاسلكية بعزل الضوضاء',
    searchBtn: 'بحث',
    resultsTitle: 'إعلانات مشابهة',
    resultsCount: '{{count}} من النتائج مطابقة',
    similarityScore: 'درجة التشابه',
    whyMatched: 'سبب التطابق',
    noVisualResults: 'لا توجد إعلانات مشابهة لهذه الصورة.',
    noTextResults: 'لا توجد إعلانات تطابق استعلامك.',
    uploadFailed: 'فشل رفع الصورة. حاول مرة أخرى.',
    fileInvalid: 'يرجى اختيار صورة بصيغة PNG أو JPG بحجم أقل من 5 ميغابايت.',
    sampleCrimson: 'قرمزي',
    sampleEmerald: 'زمردي',
    sampleNavy: 'كحلي',
    sampleAmber: 'كهرماني',
    sampleRose: 'وردي',
    sampleTeal: 'فيروزي',
    poweredBy:
      'بحث التشابه مدعوم بتضمين متجهي من 64 بُعداً يلتقط المدرّج التكراري للألوان وشبكة الإضاءة المكانية، مع ترتيب النتائج وفق تشابه جيب التمام.',
  },
  compliance: {
    title: 'مركز الامتثال',
    subtitle: 'راجع إشارات مخالفات السياسات في الكتالوج وعالجها أو استبعدها.',
    allSeverities: 'جميع درجات الخطورة',
    allStatuses: 'جميع الحالات',
    severity: 'درجة الخطورة',
    status: 'الحالة',
    flagsFound: 'تم العثور على {{count}} من الإشارات',
    rule: 'القاعدة',
    product: 'المنتج',
    confidence: 'درجة الثقة',
    evidence: 'الدليل',
    detectedAt: 'تاريخ الاكتشاف',
    resolve: 'معالجة',
    dismiss: 'استبعاد',
    resolvedOk: 'تمت معالجة الإشارة',
    dismissedOk: 'تم استبعاد الإشارة',
    noFlagsTitle: 'لا توجد إشارات هنا',
    noFlagsSub: 'كل شيء سليم — لا توجد إعلانات مخالفة ضمن عوامل التصفية الحالية.',
    riskAfter: 'المخاطر بعد المعالجة',
    statusAfter: 'الحالة بعد المعالجة',
    rescan: 'إعادة فحص الإعلان',
    evidenceKeys: {
      mentionedColors: 'الألوان المذكورة',
      dominantColors: 'الألوان السائدة',
      distance: 'المسافة',
      term: 'المصطلح',
      context: 'السياق',
      categoryAvg: 'متوسط الفئة',
      price: 'السعر',
      ratio: 'النسبة',
      required: 'المطلوب',
      matchedCategory: 'الفئة المطابقة',
      score: 'الدرجة',
      meanLuminance: 'متوسط الإضاءة',
      meanSaturation: 'متوسط التشبّع',
    },
  },
  catalog: {
    title: 'كتالوج المنتجات',
    subtitle: 'تصفح جميع الإعلانات مع درجة المخاطر وحالة الامتثال لحظياً.',
    allCategories: 'جميع الفئات',
    allStatuses: 'جميع الحالات',
    category: 'الفئة',
    status: 'الحالة',
    sort: 'الترتيب حسب',
    sortNewest: 'الأحدث أولاً',
    sortRisk: 'الأعلى مخاطر',
    sortPriceLow: 'السعر: من الأقل إلى الأعلى',
    sortPriceHigh: 'السعر: من الأعلى إلى الأقل',
    price: 'السعر',
    seller: 'البائع',
    brand: 'العلامة التجارية',
    country: 'الدولة',
    listedOn: 'تاريخ النشر',
    riskScore: 'درجة المخاطر',
    openFlags: 'إشارات مفتوحة',
    viewListing: 'عرض الإعلان',
    noProducts: 'لا توجد منتجات تطابق عوامل التصفية.',
  },
  policies: {
    title: 'قواعد السياسات',
    subtitle: 'مجموعة القواعد التي يفرضها محرك الامتثال على كل إعلان.',
    ruleCategory: 'فئة القاعدة',
    severity: 'درجة الخطورة',
    weight: 'الوزن',
    flagsTriggered: 'الإشارات المُطلَّقة',
    openFlags: 'إشارات مفتوحة',
    active: 'مفعّلة',
    inactive: 'غير مفعّلة',
    riskWeight: 'وزن المخاطر',
    catContent: 'سياسة المحتوى',
    catSafety: 'سياسة السلامة',
    catAuthenticity: 'الأصالة',
    catQuality: 'الجودة',
    catFairPricing: 'التسعير العادل',
    catListingQuality: 'جودة الإعلان',
    catRestricted: 'سلع مقيّدة',
  },
  status: {
    PENDING: 'قيد الانتظار',
    APPROVED: 'معتمد',
    NEEDS_REVIEW: 'بحاجة إلى مراجعة',
    REJECTED: 'مرفوض',
  },
  flagStatus: {
    OPEN: 'مفتوح',
    RESOLVED: 'تمت المعالجة',
    DISMISSED: 'مستبعد',
  },
  severity: {
    CRITICAL: 'حرج',
    HIGH: 'مرتفع',
    MEDIUM: 'متوسط',
    LOW: 'منخفض',
  },
  category: {
    electronics: 'إلكترونيات',
    fashion: 'أزياء',
    toys: 'ألعاب',
    home: 'المنزل',
    beauty: 'العناية والجمال',
    sports: 'رياضة',
    grocery: 'بقالة',
  },
  footer: {
    tagline: 'المساعد الذكي لأسواق أكثر موثوقية.',
    dataset: 'بيانات تجريبية من',
    datasetName: 'مجموعة بيانات Amazon Reviews 2023',
    rights: 'جميع الحقوق محفوظة.',
    tech: 'مبني بتقنيات Next.js وPrisma وذكاء اصطناعي متعدد الوسائط',
  },
  toast: {
    scanStarted: 'بدأ الفحص',
    scanDone: 'اكتمل الفحص بنجاح',
    flagResolved: 'تمت معالجة الإشارة',
    flagDismissed: 'تم استبعاد الإشارة',
    searchComplete: 'اكتمل البحث',
    loadError: 'تعذّر تحميل البيانات',
  },
  theme: {
    light: 'نهاري',
    dark: 'ليلي',
  },
}

export const dictionaries: Record<Locale, Dictionary> = { en, ar }

export function getDict(locale: Locale): Dictionary {
  return dictionaries[locale]
}
