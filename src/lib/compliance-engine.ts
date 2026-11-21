/**
 * SouqGuard AI — Policy compliance engine (server-side).
 *
 * Evaluates marketplace listings against the 9 seeded policy rules, persists
 * ComplianceFlags idempotently and recomputes each product's risk score and
 * moderation status. Rules are looked up by their stable codes.
 */

import type { Product } from '@prisma/client'
import { db } from './db'
import {
  COLOR_WORDS,
  colorDistance,
  dominantColors,
  extractColorWords,
  paletteStats,
  type Palette,
} from './embeddings'
import { CATEGORIES, CATEGORY_META, CATEGORY_REQUIREMENTS, toCategory } from './category-metadata'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface Violation {
  ruleCode: string
  confidence: number
  reasonEn: string
  reasonAr: string
  evidence: Record<string, unknown>
}

export interface ScanResult {
  flagsCreated: number
  openFlags: number
}

export interface FullScanResult {
  scanned: number
  flagged: number
  flagsCreated: number
}

// ---------------------------------------------------------------------------
// Rule codes & term lists
// ---------------------------------------------------------------------------

const RULE_CODES = {
  RESTRICTED_ITEMS: 'RESTRICTED_ITEMS',
  COUNTERFEIT_SIGNAL: 'COUNTERFEIT_SIGNAL',
  MISLEADING_CLAIMS: 'MISLEADING_CLAIMS',
  IMAGE_TEXT_MISMATCH: 'IMAGE_TEXT_MISMATCH',
  MISSING_SAFETY_INFO: 'MISSING_SAFETY_INFO',
  PRICE_ANOMALY: 'PRICE_ANOMALY',
  CATEGORY_MISMATCH: 'CATEGORY_MISMATCH',
  IMAGE_QUALITY: 'IMAGE_QUALITY',
  TITLE_QUALITY: 'TITLE_QUALITY',
} as const

const RESTRICTED_TERMS_EN = [
  'gun',
  'rifle',
  'pistol',
  'ammo',
  'ammunition',
  'weapon',
  'silencer',
  'cocaine',
  'heroin',
  'meth',
  'steroid',
  'anabolic',
  'marijuana',
  'cannabis',
  'vape',
  'e-cigarette',
  'tobacco',
  'cigarettes',
  'knuckles',
]

const RESTRICTED_TERMS_AR = [
  'مسدس',
  'بندقية',
  'سلاح',
  'ذخيرة',
  'مخدرات',
  'كوكايين',
  'حشيش',
  'منشطات',
  'تبغ',
  'سجائر',
  'فيب',
  'السيجارة الإلكترونية',
]

const COUNTERFEIT_TERMS = [
  'counterfeit',
  'replica',
  '1:1 copy',
  'mirror copy',
  'fake designer',
  'knockoff',
  'inspired by luxury brand',
  'تزوير',
  'مقلد',
  'تقليد علامة تجارية',
]

const MISLEADING_TERMS = [
  'miracle cure',
  'cures all',
  '100% guaranteed',
  'guaranteed results',
  'miracle results',
  'permanent cure',
  'علاج معجزة',
  'شفاء تام',
  'مضمون 100%',
  'نتائج مضمونة',
  'علاج نهائي',
]

const COLOR_MISMATCH_DISTANCE = 0.35

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function roundConfidence(value: number): number {
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100))
}

/** Extract roughly 12 words of context around an index in the given text. */
function contextAround(text: string, index: number, wordsPerSide = 6): string {
  const before = text
    .slice(0, index)
    .trim()
    .split(/\s+/)
    .slice(-wordsPerSide)
    .join(' ')
  const after = text
    .slice(index)
    .trim()
    .split(/\s+/)
    .slice(0, wordsPerSide + 1)
    .join(' ')
  return `${before} ${after}`.trim()
}

function findTerm(text: string, terms: string[]): { term: string; context: string } | null {
  for (const term of terms) {
    const idx = text.indexOf(term)
    if (idx !== -1) {
      return { term, context: contextAround(text, idx) }
    }
  }
  return null
}

function parsePalette(product: Product): Palette | null {
  try {
    const raw: unknown = JSON.parse(product.palette)
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const record = raw as Record<string, unknown>
      const keys: (keyof Palette)[] = ['bg1', 'bg2', 'blob1', 'blob2', 'accent']
      if (keys.every((k) => typeof record[k] === 'string')) {
        return {
          bg1: record.bg1 as string,
          bg2: record.bg2 as string,
          blob1: record.blob1 as string,
          blob2: record.blob2 as string,
          accent: record.accent as string,
        }
      }
    }
  } catch {
    return null
  }
  return null
}

function isArabicWord(word: string): boolean {
  return /[\u0600-\u06FF]/.test(word)
}

/** Name a hex color with the closest human color word from COLOR_WORDS. */
function nearestColorName(hex: string, arabic: boolean): string {
  let bestName = hex
  let bestDistance = Number.POSITIVE_INFINITY
  for (const [name, candidateHex] of Object.entries(COLOR_WORDS)) {
    if (arabic !== isArabicWord(name)) continue
    const d = colorDistance(hex, candidateHex)
    if (d < bestDistance) {
      bestDistance = d
      bestName = name
    }
  }
  return bestName
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a product against all policy rules and return the list of violations
 * (without persisting anything). Price anomaly statistics are computed across
 * the whole catalog.
 */
export async function evaluateProduct(product: Product): Promise<Violation[]> {
  const violations: Violation[] = []

  const textEn = `${product.title} ${product.description}`.toLowerCase()
  const textAr = `${product.titleAr} ${product.descriptionAr}`
  const textAllLower = `${product.title} ${product.description} ${product.titleAr} ${product.descriptionAr}`.toLowerCase()

  // 1. RESTRICTED_ITEMS — weapons, drugs, vaping, tobacco...
  const restrictedEn = findTerm(textEn, RESTRICTED_TERMS_EN)
  const restrictedAr = findTerm(textAr, RESTRICTED_TERMS_AR)
  const restricted = restrictedEn ?? restrictedAr
  if (restricted) {
    violations.push({
      ruleCode: RULE_CODES.RESTRICTED_ITEMS,
      confidence: 0.95,
      reasonEn: `The listing text contains the restricted term "${restricted.term}" — weapons, drugs, vaping, and other regulated goods cannot be sold on the marketplace.`,
      reasonAr: `يتضمن نص الإعلان مصطلحاً محظوراً («${restricted.term}») — لا يجوز عرض الأسلحة أو المخدرات أو منتجات التبغ والسيجارة الإلكترونية أو السلع المنظمة الأخرى في المتجر.`,
      evidence: { term: restricted.term, context: restricted.context },
    })
  }

  // 2. COUNTERFEIT_SIGNAL — replica / knockoff language
  const counterfeit = findTerm(textEn, COUNTERFEIT_TERMS) ?? findTerm(textAr, COUNTERFEIT_TERMS)
  if (counterfeit) {
    violations.push({
      ruleCode: RULE_CODES.COUNTERFEIT_SIGNAL,
      confidence: 0.92,
      reasonEn: `Authenticity risk: the listing uses counterfeit-related language ("${counterfeit.term}") suggesting a replica or unauthorized copy of a branded product.`,
      reasonAr: `مخاطرة في الأصالة: يستخدم الإعلان عبارات مرتبطة بالتقليد («${counterfeit.term}») تشير إلى نسخة مقلدة أو غير معتمدة من منتج يحمل علامة تجارية.`,
      evidence: { term: counterfeit.term, context: counterfeit.context },
    })
  }

  // 3. MISLEADING_CLAIMS — miracle cures / guaranteed results
  const misleading = findTerm(textEn, MISLEADING_TERMS) ?? findTerm(textAr, MISLEADING_TERMS)
  if (misleading) {
    violations.push({
      ruleCode: RULE_CODES.MISLEADING_CLAIMS,
      confidence: 0.9,
      reasonEn: `The listing makes an absolute claim ("${misleading.term}") that cannot be verified — exaggerated health and results promises are prohibited in product descriptions.`,
      reasonAr: `يتضمن الإعلان ادعاءً مطلقاً («${misleading.term}») لا يمكن إثباته — تُحظر وعود الشفاء والنتائج المبالغ فيها في أوصاف المنتجات.`,
      evidence: { term: misleading.term, context: misleading.context },
    })
  }

  // 4. IMAGE_TEXT_MISMATCH — described colors contradict the image's palette
  const palette = parsePalette(product)
  const mentioned = extractColorWords(
    `${product.title} ${product.description} ${product.titleAr} ${product.descriptionAr}`,
  )
  if (palette && mentioned.length > 0) {
    const dominant = dominantColors(palette)
    const perColor = mentioned.map((m) => ({
      ...m,
      minDistance: Math.min(...dominant.map((d) => colorDistance(m.hex, d))),
    }))
    if (perColor.every((c) => c.minDistance > COLOR_MISMATCH_DISTANCE)) {
      const minDistance = Math.min(...perColor.map((c) => c.minDistance))
      const confidence = roundConfidence(0.55 + (minDistance - COLOR_MISMATCH_DISTANCE))
      const mentionedWords = perColor.map((c) => c.word)
      const dominantEn = dominant.map((d) => nearestColorName(d, false))
      const dominantAr = dominant.map((d) => nearestColorName(d, true))
      violations.push({
        ruleCode: RULE_CODES.IMAGE_TEXT_MISMATCH,
        confidence: Math.min(0.95, confidence),
        reasonEn: `Listing describes the product as "${mentionedWords.join('", "')}", but the uploaded image's dominant colors are ${dominantEn.join('/')} (color distance ${round2(minDistance)}). Product photos must match the described item.`,
        reasonAr: `يصف الإعلان المنتج بأنه «${mentionedWords.join('، ')}» بينما تُظهر الصورة ألواناً غالبة مختلفة (${dominantAr.join('، ')}) بمسافة لونية ${round2(minDistance)}، ويجب أن تطابق صور المنتجات الوصف النصي.`,
        evidence: {
          mentionedColors: mentionedWords,
          dominantColors: dominant,
          distance: round2(minDistance),
        },
      })
    }
  }

  // 5. MISSING_SAFETY_INFO — mandatory disclosures per category
  const category = toCategory(product.category)
  const requirement = category ? CATEGORY_REQUIREMENTS[category] : null
  if (category && requirement) {
    const hasDisclosure = requirement.keywords.some((k) => textAllLower.includes(k.toLowerCase()))
    if (!hasDisclosure) {
      violations.push({
        ruleCode: RULE_CODES.MISSING_SAFETY_INFO,
        confidence: 0.85,
        reasonEn: `Required safety disclosure missing: ${requirement.requirementEn}. "${CATEGORY_META[category].labelEn}" listings must include this information.`,
        reasonAr: `تنقص معلومات السلامة الإلزامية: ${requirement.requirementAr}. يجب أن تتضمن إعلانات فئة «${CATEGORY_META[category].labelAr}» هذه المعلومات.`,
        evidence: {
          category,
          required: requirement.requirementEn,
          requiredAr: requirement.requirementAr,
          checkedKeywords: requirement.keywords,
        },
      })
    }
  }

  // 6. PRICE_ANOMALY — deviation from the category average
  const categoryAgg = await db.product.groupBy({
    by: ['category'],
    _avg: { price: true },
    where: { category: product.category },
  })
  const categoryAvg = categoryAgg[0]?._avg.price ?? product.price
  if (categoryAvg && categoryAvg > 0) {
    const ratio = product.price / categoryAvg
    if (ratio < 0.25) {
      violations.push({
        ruleCode: RULE_CODES.PRICE_ANOMALY,
        confidence: roundConfidence(Math.min(0.9, 0.6 + (0.25 - ratio))),
        reasonEn: `Listed at $${product.price.toFixed(2)}, this item is priced at only ${(ratio * 100).toFixed(0)}% of the "${product.category}" average ($${categoryAvg.toFixed(2)}) — a possible pricing error or bait listing.`,
        reasonAr: `سعر المنتج (${product.price.toFixed(2)}$) لا يتجاوز ${(ratio * 100).toFixed(0)}% من متوسط فئة «${CATEGORY_META[toCategory(product.category) ?? 'home'].labelAr}» (${categoryAvg.toFixed(2)}$)، ما قد يشير إلى خطأ في التسعير أو إعلان مضلل.`,
        evidence: {
          price: product.price,
          categoryAvg: round2(categoryAvg),
          ratio: round2(ratio),
        },
      })
    } else if (ratio > 4) {
      violations.push({
        ruleCode: RULE_CODES.PRICE_ANOMALY,
        confidence: 0.75,
        reasonEn: `Listed at $${product.price.toFixed(2)}, this item is priced at ${ratio.toFixed(1)}x the "${product.category}" average ($${categoryAvg.toFixed(2)}) — verify the price for fairness.`,
        reasonAr: `سعر المنتج (${product.price.toFixed(2)}$) يبلغ ${ratio.toFixed(1)} أضعاف متوسط فئة «${CATEGORY_META[toCategory(product.category) ?? 'home'].labelAr}» (${categoryAvg.toFixed(2)}$) — يُنصح بمراجعة السعر لضمان العدالة.`,
        evidence: {
          price: product.price,
          categoryAvg: round2(categoryAvg),
          ratio: round2(ratio),
        },
      })
    }
  }

  // 7. CATEGORY_MISMATCH — text scores against the wrong taxonomy branch
  if (category) {
    const scores = CATEGORIES.map((c) => ({
      category: c,
      score: CATEGORY_META[c].keywords.filter((k) => textAllLower.includes(k.toLowerCase())).length,
    }))
    const ownScore = scores.find((s) => s.category === category)?.score ?? 0
    const bestOther = scores
      .filter((s) => s.category !== category)
      .reduce<(typeof scores)[number] | null>((best, s) => (!best || s.score > best.score ? s : best), null)
    if (ownScore === 0 && bestOther && bestOther.score >= 3) {
      violations.push({
        ruleCode: RULE_CODES.CATEGORY_MISMATCH,
        confidence: roundConfidence(Math.min(0.9, 0.6 + 0.1 * bestOther.score)),
        reasonEn: `The listing is filed under "${CATEGORY_META[category].labelEn}" but its text strongly matches "${CATEGORY_META[bestOther.category].labelEn}" (keyword score ${bestOther.score}). Listings must be placed in the correct category.`,
        reasonAr: `الإعلان مصنف ضمن فئة «${CATEGORY_META[category].labelAr}» بينما يشير نصه بقوة إلى فئة «${CATEGORY_META[bestOther.category].labelAr}» (درجة التطابق ${bestOther.score}). يجب إدراج المنتجات في الفئة الصحيحة.`,
        evidence: {
          listedCategory: category,
          matchedCategory: bestOther.category,
          score: bestOther.score,
        },
      })
    }
  }

  // 8. IMAGE_QUALITY — palette too dark or washed out
  if (palette) {
    const { meanLuminance, meanSaturation } = paletteStats(palette)
    if (meanLuminance < 55) {
      violations.push({
        ruleCode: RULE_CODES.IMAGE_QUALITY,
        confidence: roundConfidence(Math.min(0.9, 0.6 + (55 - meanLuminance) / 100)),
        reasonEn: `The product image is too dark (mean luminance ${Math.round(meanLuminance)}/255). Brighter, clearer photos help buyers evaluate the product.`,
        reasonAr: `صورة المنتج داكنة جداً (متوسط الإضاءة ${Math.round(meanLuminance)}/255)، والصور الأوضح تساعد المشترين على تقييم المنتج بدقة.`,
        evidence: {
          meanLuminance: Math.round(meanLuminance),
          meanSaturation: round2(meanSaturation),
        },
      })
    } else if (meanSaturation < 0.12) {
      violations.push({
        ruleCode: RULE_CODES.IMAGE_QUALITY,
        confidence: 0.7,
        reasonEn: `The product image looks washed out with low color contrast (mean saturation ${round2(meanSaturation)}) — likely a low-quality photo.`,
        reasonAr: `تبدو صورة المنتج باهتة بتباين لوني منخفض (متوسط التشبع ${round2(meanSaturation)})، وغالباً أنها صورة ضعيفة الجودة.`,
        evidence: {
          meanLuminance: Math.round(meanLuminance),
          meanSaturation: round2(meanSaturation),
        },
      })
    }
  }

  // 9. TITLE_QUALITY — too short or all-caps
  const title = product.title
  if (title.length < 15) {
    violations.push({
      ruleCode: RULE_CODES.TITLE_QUALITY,
      confidence: 0.8,
      reasonEn: `The listing title is only ${title.length} characters long — too short to describe the product adequately (minimum 15 characters).`,
      reasonAr: `عنوان الإعلان لا يتجاوز ${title.length} حرفاً، وهو أقصر من الحد الأدنى المطلوب (15 حرفاً) لوصف المنتج بوضوح.`,
      evidence: { title, titleLength: title.length, issue: 'too_short' },
    })
  } else {
    const letters = title.replace(/[^a-zA-Z]/g, '')
    if (letters.length > 0 && letters === letters.toUpperCase() && title.length >= 10) {
      violations.push({
        ruleCode: RULE_CODES.TITLE_QUALITY,
        confidence: 0.7,
        reasonEn: 'The listing title is written entirely in capital letters, which hurts readability and search ranking.',
        reasonAr: 'عنوان الإعلان مكتوب بأحرف كبيرة بالكامل، مما يضعف قابلية القراءة ويقلل من ترتيبه في نتائج البحث.',
        evidence: { title, titleLength: title.length, issue: 'all_caps' },
      })
    }
  }

  return violations
}

// ---------------------------------------------------------------------------
// Persisting scans
// ---------------------------------------------------------------------------

function flagId(): string {
  return `flag_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Re-scan a single product: evaluate it, sync its OPEN flags (delete flags whose
 * rule no longer fires, create flags for new violations) and persist the
 * recomputed riskScore + status. RESOLVED/DISMISSED flags are history and are
 * never modified — but if a violation re-triggers, a fresh OPEN flag is created.
 */
export async function scanProduct(productId: string): Promise<ScanResult> {
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) throw new Error(`Product not found: ${productId}`)

  const rules = await db.policyRule.findMany({ where: { active: true } })
  const ruleByCode = new Map(rules.map((r) => [r.code, r]))

  const violations = (await evaluateProduct(product)).filter((v) => ruleByCode.has(v.ruleCode))
  const violationCodes = new Set(violations.map((v) => v.ruleCode))

  const existingOpen = await db.complianceFlag.findMany({
    where: { productId, status: 'OPEN' },
    include: { rule: true },
  })

  // Remove OPEN flags whose rule no longer fires.
  const staleIds = existingOpen.filter((f) => !violationCodes.has(f.rule.code)).map((f) => f.id)
  if (staleIds.length > 0) {
    await db.complianceFlag.deleteMany({ where: { id: { in: staleIds } } })
  }

  // Create flags for violations that have no OPEN flag yet.
  const openCodes = new Set(existingOpen.filter((f) => violationCodes.has(f.rule.code)).map((f) => f.rule.code))
  let flagsCreated = 0
  for (const violation of violations) {
    if (openCodes.has(violation.ruleCode)) continue
    const rule = ruleByCode.get(violation.ruleCode)
    if (!rule) continue
    await db.complianceFlag.create({
      data: {
        id: flagId(),
        productId: product.id,
        ruleId: rule.id,
        severity: rule.severity,
        status: 'OPEN',
        confidence: violation.confidence,
        reasonEn: violation.reasonEn,
        reasonAr: violation.reasonAr,
        evidence: JSON.stringify(violation.evidence),
      },
    })
    flagsCreated++
  }

  // Recompute risk score & status from the resulting OPEN flags.
  const openFlags = await db.complianceFlag.findMany({
    where: { productId, status: 'OPEN' },
    include: { rule: true },
  })
  const raw = openFlags.reduce((sum, f) => sum + f.rule.weight * f.confidence, 0)
  const riskScore = Math.min(100, Math.round(raw))
  const hasCritical = openFlags.some((f) => f.severity === 'CRITICAL')
  const hasHigh = openFlags.some((f) => f.severity === 'HIGH')

  let status: string
  if (hasCritical || raw >= 50) status = 'REJECTED'
  else if (raw >= 22 || hasHigh) status = 'NEEDS_REVIEW'
  else status = 'APPROVED'

  await db.product.update({ where: { id: product.id }, data: { riskScore, status } })

  return { flagsCreated, openFlags: openFlags.length }
}

/** Scan every product in the catalog (ordered by id). */
export async function runFullScan(): Promise<FullScanResult> {
  const products = await db.product.findMany({ orderBy: { id: 'asc' }, select: { id: true } })
  let flagged = 0
  let flagsCreated = 0
  for (const product of products) {
    const result = await scanProduct(product.id)
    flagsCreated += result.flagsCreated
    if (result.openFlags > 0) flagged++
  }
  return { scanned: products.length, flagged, flagsCreated }
}

/**
 * Recompute (and persist) a product's risk score and moderation status from its
 * currently OPEN flags — used after a moderator resolves or dismisses a flag.
 */
export async function recomputeProductRisk(productId: string): Promise<{ riskScore: number; status: string }> {
  const openFlags = await db.complianceFlag.findMany({
    where: { productId, status: 'OPEN' },
    include: { rule: true },
  })
  const raw = openFlags.reduce((sum, f) => sum + f.rule.weight * f.confidence, 0)
  const riskScore = Math.min(100, Math.round(raw))
  const hasCritical = openFlags.some((f) => f.severity === 'CRITICAL')
  const hasHigh = openFlags.some((f) => f.severity === 'HIGH')

  let status: string
  if (hasCritical || raw >= 50) status = 'REJECTED'
  else if (raw >= 22 || hasHigh) status = 'NEEDS_REVIEW'
  else status = 'APPROVED'

  await db.product.update({ where: { id: productId }, data: { riskScore, status } })
  return { riskScore, status }
}
