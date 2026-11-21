/**
 * SouqGuard AI — GET /api/products
 *
 * Catalog listing with optional filters and sorting.
 *   ?category=  exact match against the taxonomy
 *   ?status=    PENDING | APPROVED | NEEDS_REVIEW | REJECTED
 *   ?q=         case-insensitive substring across title, titleAr, brand, sellerName (max 200 chars)
 *   ?sort=      newest (listingDate desc, default) | risk | price_asc | price_desc
 *
 * Every result carries its open-flag count; ordering is stable (id asc tiebreak).
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { CATEGORIES } from '@/lib/category-metadata'
import { toProductDTO, type ProductDTO, type ProductRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

const PRODUCT_STATUSES = ['PENDING', 'APPROVED', 'NEEDS_REVIEW', 'REJECTED'] as const
const SORT_KEYS = ['newest', 'risk', 'price_asc', 'price_desc'] as const

const MAX_QUERY_LENGTH = 200

const querySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  q: z.string().max(MAX_QUERY_LENGTH).optional(),
  sort: z.enum(SORT_KEYS).default('newest'),
})

function sortProducts(products: ProductRow[], sort: (typeof SORT_KEYS)[number]): ProductRow[] {
  const byId = (a: ProductRow, b: ProductRow): number => a.id.localeCompare(b.id)
  const sorted = [...products]
  switch (sort) {
    case 'risk':
      sorted.sort((a, b) => b.riskScore - a.riskScore || byId(a, b))
      break
    case 'price_asc':
      sorted.sort((a, b) => a.price - b.price || byId(a, b))
      break
    case 'price_desc':
      sorted.sort((a, b) => b.price - a.price || byId(a, b))
      break
    case 'newest':
    default:
      sorted.sort(
        (a, b) => new Date(b.listingDate).getTime() - new Date(a.listingDate).getTime() || byId(a, b),
      )
      break
  }
  return sorted
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const raw = {
      category: url.searchParams.get('category') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      q: url.searchParams.get('q') ?? undefined,
      sort: url.searchParams.get('sort') ?? undefined,
    }
    const parsed = querySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }
    const { category, status, q, sort } = parsed.data

    // Filters with exact Prisma matches; the free-text `q` is matched
    // case-insensitively in memory (SQLite has no insensitive LIKE mode).
    const where: { category?: string; status?: string } = {}
    if (category) where.category = category
    if (status) where.status = status

    const [rows, openFlagGroups] = await Promise.all([
      db.product.findMany({ where }),
      db.complianceFlag.groupBy({
        by: ['productId'],
        _count: { _all: true },
        where: { status: 'OPEN' },
      }),
    ])
    const openFlagCounts = new Map(openFlagGroups.map((g) => [g.productId, g._count._all]))

    const needle = (q ?? '').trim().toLowerCase()
    const matched = needle
      ? rows.filter(
          (p) =>
            p.title.toLowerCase().includes(needle) ||
            p.titleAr.toLowerCase().includes(needle) ||
            p.brand.toLowerCase().includes(needle) ||
            p.sellerName.toLowerCase().includes(needle),
        )
      : rows

    const products: ProductDTO[] = sortProducts(matched, sort).map((p) =>
      toProductDTO(p, openFlagCounts.get(p.id) ?? 0),
    )

    return NextResponse.json({ products, total: products.length })
  } catch (error) {
    console.error('GET /api/products failed:', error)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}
