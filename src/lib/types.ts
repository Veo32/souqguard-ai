/**
 * SouqGuard AI — Shared DTO types used by the API routes and the UI.
 * Server rows are converted into these transport-safe shapes (dates as ISO
 * strings, palette parsed into a flat hex array, computed counts attached).
 */

import type { Prisma } from '@prisma/client'

export type ProductStatus = 'PENDING' | 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED'
export type FlagStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED'
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface ProductDTO {
  id: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  category: string
  brand: string
  sellerName: string
  sellerCountry: string
  price: number
  currency: string
  status: ProductStatus
  riskScore: number
  palette: string[]
  imageUrl: string
  openFlags: number
  listingDate: string
}

export interface FlagDTO {
  id: string
  productId: string
  productTitle: string
  productTitleAr: string
  productImageUrl: string
  productCategory: string
  productPrice: number
  productRiskScore: number
  ruleCode: string
  ruleNameEn: string
  ruleNameAr: string
  severity: Severity
  status: FlagStatus
  confidence: number
  reasonEn: string
  reasonAr: string
  evidence: Record<string, unknown>
  createdAt: string
  resolvedAt: string | null
}

export interface PolicyDTO {
  id: string
  code: string
  nameEn: string
  nameAr: string
  descriptionEn: string
  descriptionAr: string
  ruleCategory: string
  severity: Severity
  weight: number
  active: boolean
  flagCount: number
  openFlagCount: number
}

export interface StatsDTO {
  totalProducts: number
  statusCounts: Record<string, number>
  openFlags: number
  criticalFlags: number
  avgRiskScore: number
  complianceRate: number
  riskDistribution: { label: string; count: number }[]
  categoryStats: { category: string; count: number; avgRisk: number; openFlags: number }[]
  recentFlags: FlagDTO[]
  totalScans: number
  totalSearches: number
  lastScanAt: string | null
}

export interface SearchHit {
  product: ProductDTO
  score: number
  matchReasonEn: string
  matchReasonAr: string
}

export interface SearchResponse {
  results: SearchHit[]
}

/** The raw Prisma product row (as returned by `db.product.find*`). */
export type ProductRow = Prisma.ProductGetPayload<Record<string, never>>

const PALETTE_FALLBACK = '#E8E6E1'

function parsePalette(paletteJson: string): string[] {
  try {
    const parsed: unknown = JSON.parse(paletteJson)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>
      const pick = (key: string): string => (typeof record[key] === 'string' ? (record[key] as string) : PALETTE_FALLBACK)
      return [pick('bg1'), pick('bg2'), pick('blob1'), pick('blob2'), pick('accent')]
    }
    if (Array.isArray(parsed)) {
      const colors = parsed.map((v) => (typeof v === 'string' ? v : PALETTE_FALLBACK))
      while (colors.length < 5) colors.push(PALETTE_FALLBACK)
      return colors.slice(0, 5)
    }
  } catch {
    // fall through to fallback palette
  }
  return [PALETTE_FALLBACK, PALETTE_FALLBACK, PALETTE_FALLBACK, PALETTE_FALLBACK, PALETTE_FALLBACK]
}

/** Convert a Prisma product row (plus its open-flag count) into a ProductDTO. */
export function toProductDTO(p: ProductRow, openFlags: number): ProductDTO {
  return {
    id: p.id,
    title: p.title,
    titleAr: p.titleAr,
    description: p.description,
    descriptionAr: p.descriptionAr,
    category: p.category,
    brand: p.brand,
    sellerName: p.sellerName,
    sellerCountry: p.sellerCountry,
    price: p.price,
    currency: p.currency,
    status: p.status as ProductStatus,
    riskScore: p.riskScore,
    palette: parsePalette(p.palette),
    imageUrl: `/api/image/${p.id}`,
    openFlags,
    listingDate: p.listingDate instanceof Date ? p.listingDate.toISOString() : new Date(p.listingDate).toISOString(),
  }
}
