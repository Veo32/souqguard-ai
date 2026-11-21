/**
 * SouqGuard AI — Category taxonomy, bilingual metadata and per-category
 * safety disclosure requirements used by the compliance engine.
 */

export const CATEGORIES = ['electronics', 'fashion', 'toys', 'home', 'beauty', 'sports', 'grocery'] as const

export type Category = (typeof CATEGORIES)[number]

export interface CategoryMeta {
  labelEn: string
  labelAr: string
  icon: string // lucide icon name
  keywords: string[] // EN + AR search/keyword terms (lowercase for EN)
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  electronics: {
    labelEn: 'Electronics',
    labelAr: 'إلكترونيات',
    icon: 'Smartphone',
    keywords: [
      'wireless',
      'bluetooth',
      'headphone',
      'speaker',
      'charger',
      'battery',
      'camera',
      'smartwatch',
      'earbuds',
      'usb',
      'led',
      'laptop',
      'سماعة',
      'لاسلكي',
      'شاحن',
      'كاميرا',
      'ساعة ذكية',
      'بطارية',
    ],
  },
  fashion: {
    labelEn: 'Fashion',
    labelAr: 'أزياء',
    icon: 'Shirt',
    keywords: [
      'shirt',
      'dress',
      'bag',
      'shoes',
      'leather',
      'cotton',
      'linen',
      'jacket',
      'cardigan',
      'sneakers',
      'handbag',
      'scarf',
      'قميص',
      'فستان',
      'حقيبة',
      'حذاء',
      'جلد',
      'قطن',
    ],
  },
  toys: {
    labelEn: 'Toys & Games',
    labelAr: 'ألعاب',
    icon: 'Blocks',
    keywords: [
      'blocks',
      'puzzle',
      'kids',
      'children',
      'educational',
      'toy',
      'building',
      'stem',
      'doll',
      'figure',
      'play',
      'game',
      'ألعاب',
      'أطفال',
      'لعبة',
      'تعليمي',
    ],
  },
  home: {
    labelEn: 'Home & Living',
    labelAr: 'المنزل',
    icon: 'Sofa',
    keywords: [
      'blanket',
      'pillow',
      'kitchen',
      'dining',
      'decor',
      'vase',
      'lamp',
      'cushion',
      'sofa',
      'mug',
      'bedsheet',
      'cookware',
      'مطبخ',
      'غرفة النوم',
      'وسادة',
      'ديكور',
      'طاولة',
      'فاز',
    ],
  },
  beauty: {
    labelEn: 'Beauty & Care',
    labelAr: 'العناية والجمال',
    icon: 'Sparkles',
    keywords: [
      'serum',
      'cream',
      'skincare',
      'vitamin',
      'moisturizer',
      'lipstick',
      'fragrance',
      'gloss',
      'tone',
      'skin',
      'brightening',
      'ingredients',
      'بشرة',
      'سيروم',
      'كريم',
      'عناية',
      'مرطب',
      'مكونات',
    ],
  },
  sports: {
    labelEn: 'Sports & Fitness',
    labelAr: 'رياضة',
    icon: 'Dumbbell',
    keywords: [
      'fitness',
      'running',
      'gym',
      'dumbbell',
      'training',
      'exercise',
      'workout',
      'cardio',
      'weights',
      'treadmill',
      'resistance',
      'athletics',
      'لياقة',
      'جيم',
      'جري',
      'تدريب',
      'تمارين',
      'أثقال',
    ],
  },
  grocery: {
    labelEn: 'Grocery & Gourmet',
    labelAr: 'بقالة',
    icon: 'Coffee',
    keywords: [
      'organic',
      'tea',
      'coffee',
      'dates',
      'snack',
      'gourmet',
      'honey',
      'spice',
      'nuts',
      'expiry',
      'fresh',
      'gift box',
      'عضوي',
      'شاي',
      'قهوة',
      'تمور',
      'عسل',
      'وجبات خفيفة',
    ],
  },
}

export interface CategoryRequirement {
  requirementEn: string
  requirementAr: string
  keywords: string[]
}

/**
 * Safety disclosures that listings in a category MUST contain. `null` means the
 * category has no mandatory disclosure. The engine flags a product when NONE of
 * the category's keywords appear anywhere in its title/description (EN or AR).
 */
export const CATEGORY_REQUIREMENTS: Record<Category, CategoryRequirement | null> = {
  toys: {
    requirementEn: 'age suitability and small-parts choking hazard warning',
    requirementAr: 'بيان الفئة العمرية وتحذير خطر الاختناق للقطع الصغيرة',
    keywords: ['age 3', 'ages', 'choking', 'small parts', 'تحذير', 'عمر 3', 'قطع صغيرة', 'بعيدا عن متناول الأطفال'],
  },
  electronics: {
    requirementEn: 'certification mark such as CE, FCC, UL or RoHS',
    requirementAr: 'علامة اعتماد مثل CE أو FCC أو UL أو RoHS',
    keywords: ['ce', 'fcc', 'ul', 'certified', 'rohs', 'معتمد', 'شهادة'],
  },
  beauty: {
    requirementEn: 'a full ingredients list',
    requirementAr: 'قائمة المكونات الكاملة',
    keywords: ['ingredients', 'المكونات', 'مكونات'],
  },
  grocery: {
    requirementEn: 'expiry or best-before date',
    requirementAr: 'تاريخ الانتهاء أو مدة الصلاحية',
    keywords: ['expiry', 'best before', 'expiration', 'تاريخ الانتهاء', 'الصلاحية', 'صلاحية'],
  },
  fashion: null,
  home: null,
  sports: null,
}

/** Safely narrow an arbitrary category string to the taxonomy, or return null. */
export function toCategory(value: string): Category | null {
  return (CATEGORIES as readonly string[]).includes(value) ? (value as Category) : null
}
