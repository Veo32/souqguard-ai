/**
 * SouqGuard AI — POST /api/search
 *
 * Multimodal product search.
 *   VISUAL: { mode: 'VISUAL', embedding: number[64] } — cosine similarity against
 *           every product's palette-derived embedding, rescaled for display:
 *           score = clamp((cos - 0.35) / 0.6, 0.02, 1).
 *   TEXT:   { mode: 'TEXT', text: string (1..120 chars) } — weighted token
 *           scoring across title (+3), brand (+2), category keywords (+1.5)
 *           and description (+1), normalized by the per-token maximum.
 *
 * Returns up to 12 SearchHits (score desc, id asc tiebreak) and logs a
 * SearchQuery row for analytics.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { CATEGORY_META, toCategory } from '@/lib/category-metadata'
import { COLOR_WORDS, EMBEDDING_DIM, cosineSimilarity, colorDistance, type Palette } from '@/lib/embeddings'
import { toProductDTO, type ProductRow, type SearchHit, type SearchResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

const bodySchema = z.union([
  z.object({
    mode: z.literal('VISUAL'),
    embedding: z.array(z.number()).length(EMBEDDING_DIM),
  }),
  z.object({
    mode: z.literal('TEXT'),
    text: z.string().min(1).max(120),
  }),
])

async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text()
  if (!text.trim()) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Palette / embedding parsing helpers
// ---------------------------------------------------------------------------

const ARABIC_SCRIPT = /[\u0600-\u06FF]/

function parsePalette(raw: string): Palette | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>
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
    // unparsable palette → ignored
  }
  return null
}

function parseEmbedding(raw: string): number[] | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length !== EMBEDDING_DIM) return null
    const numbers: number[] = []
    for (const value of parsed) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return null
      numbers.push(value)
    }
    return numbers
  } catch {
    return null
  }
}

/** Name a hex color with the closest human color word from COLOR_WORDS. */
function nearestColorName(hex: string, arabic: boolean): string {
  let bestName = arabic ? 'رمادي' : 'gray'
  let bestDistance = Number.POSITIVE_INFINITY
  for (const [name, candidateHex] of Object.entries(COLOR_WORDS)) {
    if (ARABIC_SCRIPT.test(name) !== arabic) continue
    const distance = colorDistance(hex, candidateHex)
    if (distance < bestDistance) {
      bestDistance = distance
      bestName = name
    }
  }
  return bestName
}

function clampScore(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

interface ScoredProduct {
  product: ProductRow
  score: number
  matchReasonEn: string
  matchReasonAr: string
}

function scoreVisual(products: ProductRow[], queryEmbedding: number[]): ScoredProduct[] {
  const scored: { product: ProductRow; score: number }[] = []
  for (const product of products) {
    const embedding = parseEmbedding(product.imageEmbedding)
    if (!embedding) continue
    const cos = cosineSimilarity(queryEmbedding, embedding)
    const score = clampScore((cos - 0.35) / 0.6, 0.02, 1)
    scored.push({ product, score })
  }
  return scored.map(({ product, score }) => {
    const palette = parsePalette(product.palette)
    const category = toCategory(product.category)
    const labelEn = category ? CATEGORY_META[category].labelEn : product.category
    const labelAr = category ? CATEGORY_META[category].labelAr : product.category
    if (palette) {
      const namesEn = [...new Set([nearestColorName(palette.bg1, false), nearestColorName(palette.bg2, false)])]
      const namesAr = [...new Set([nearestColorName(palette.bg1, true), nearestColorName(palette.bg2, true)])]
      return {
        product,
        score,
        matchReasonEn: `Palette similarity — dominant ${namesEn.join(' and ')} artwork in ${labelEn}`,
        matchReasonAr: `تشابه في لوحة الألوان — ألوان غالبة ${namesAr.join(' و')} ضمن فئة ${labelAr}`,
      }
    }
    return {
      product,
      score,
      matchReasonEn: `Palette similarity — custom color palette artwork in ${labelEn}`,
      matchReasonAr: `تشابه في لوحة الألوان — لوحة ألوان مخصصة ضمن فئة ${labelAr}`,
    }
  })
}

type MatchField = 'title' | 'brand' | 'category' | 'description'

const FIELD_LABELS_AR: Record<MatchField, string> = {
  title: 'العنوان',
  brand: 'العلامة التجارية',
  category: 'الفئة',
  description: 'الوصف',
}
const FIELD_ORDER: MatchField[] = ['title', 'brand', 'category', 'description']

function scoreText(products: ProductRow[], queryText: string): ScoredProduct[] {
  const tokens = queryText
    .split(/[^a-zA-Z\u0600-\u06FF]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
  if (tokens.length === 0) return []

  const uniqueTokens = [...new Set(tokens)]
  const scored: { product: ProductRow; score: number; fields: Set<MatchField> }[] = []

  for (const product of products) {
    const title = product.title.toLowerCase()
    const titleAr = product.titleAr.toLowerCase()
    const brand = product.brand.toLowerCase()
    const description = product.description.toLowerCase()
    const descriptionAr = product.descriptionAr.toLowerCase()
    const category = toCategory(product.category)
    const keywords = category ? CATEGORY_META[category].keywords : []

    let raw = 0
    const fields = new Set<MatchField>()
    for (const token of tokens) {
      const t = token.toLowerCase()
      if (title.includes(t) || titleAr.includes(t)) {
        raw += 3
        fields.add('title')
      }
      if (brand.includes(t)) {
        raw += 2
        fields.add('brand')
      }
      if (keywords.some((k) => k.toLowerCase().includes(t) || t.includes(k.toLowerCase()))) {
        raw += 1.5
        fields.add('category')
      }
      if (description.includes(t) || descriptionAr.includes(t)) {
        raw += 1
        fields.add('description')
      }
    }
    if (raw <= 0) continue
    const score = clampScore(raw / (tokens.length * 3), 0.05, 1)
    scored.push({ product, score, fields })
  }

  return scored.map(({ product, score, fields }) => {
    const matchedFields = FIELD_ORDER.filter((f) => fields.has(f))
    return {
      product,
      score,
      matchReasonEn: `Matched "${uniqueTokens.join(', ')}" in ${matchedFields.join(', ')}`,
      matchReasonAr: `تطابقت كلمات البحث «${uniqueTokens.join('، ')}» في ${matchedFields
        .map((f) => FIELD_LABELS_AR[f])
        .join(' و')}`,
    }
  })
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request)
    if (body === null) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            'Invalid search request — expected { mode: "VISUAL", embedding: 64 numbers } or { mode: "TEXT", text }',
        },
        { status: 400 },
      )
    }
    const { mode } = parsed.data

    const [products, openFlagGroups] = await Promise.all([
      db.product.findMany({ orderBy: { id: 'asc' } }),
      db.complianceFlag.groupBy({
        by: ['productId'],
        _count: { _all: true },
        where: { status: 'OPEN' },
      }),
    ])
    const openFlagCounts = new Map(openFlagGroups.map((g) => [g.productId, g._count._all]))

    const scored =
      mode === 'VISUAL'
        ? scoreVisual(products, parsed.data.embedding)
        : scoreText(products, parsed.data.text)

    scored.sort((a, b) => b.score - a.score || a.product.id.localeCompare(b.product.id))
    const top = scored.slice(0, 12)

    const results: SearchHit[] = top.map(({ product, score, matchReasonEn, matchReasonAr }) => ({
      product: toProductDTO(product, openFlagCounts.get(product.id) ?? 0),
      score,
      matchReasonEn,
      matchReasonAr,
    }))

    await db.searchQuery.create({
      data: {
        mode,
        queryText: mode === 'TEXT' ? parsed.data.text : null,
        resultCount: results.length,
        topScore: results.length > 0 ? results[0].score : 0,
      },
    })

    const response: SearchResponse = { results }
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('POST /api/search failed:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
