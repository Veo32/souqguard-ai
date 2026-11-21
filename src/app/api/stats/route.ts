/**
 * SouqGuard AI — GET /api/stats
 *
 * Aggregated dashboard statistics: catalog size, moderation status counts,
 * open/critical flag totals, average risk, risk-band distribution, per-category
 * health, the latest open flags and scan/search activity.
 */

import { NextResponse } from 'next/server'
import type { ComplianceFlag, PolicyRule, Product } from '@prisma/client'
import { db } from '@/lib/db'
import { CATEGORIES } from '@/lib/category-metadata'
import type { FlagDTO, FlagStatus, Severity, StatsDTO } from '@/lib/types'

export const dynamic = 'force-dynamic'

type FlagRow = ComplianceFlag & { product: Product; rule: PolicyRule }

/** Parse the flag evidence JSON string; unparsable values fall back to `{}`. */
function parseEvidence(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // unparsable evidence → empty object
  }
  return {}
}

function toFlagDTO(f: FlagRow): FlagDTO {
  return {
    id: f.id,
    productId: f.productId,
    productTitle: f.product.title,
    productTitleAr: f.product.titleAr,
    productImageUrl: `/api/image/${f.productId}`,
    productCategory: f.product.category,
    productPrice: f.product.price,
    productRiskScore: f.product.riskScore,
    ruleCode: f.rule.code,
    ruleNameEn: f.rule.nameEn,
    ruleNameAr: f.rule.nameAr,
    severity: f.severity as Severity,
    status: f.status as FlagStatus,
    confidence: Math.round(f.confidence * 100) / 100,
    reasonEn: f.reasonEn,
    reasonAr: f.reasonAr,
    evidence: parseEvidence(f.evidence),
    createdAt: f.createdAt.toISOString(),
    resolvedAt: f.resolvedAt ? f.resolvedAt.toISOString() : null,
  }
}

const RISK_BANDS = ['0-20', '21-40', '41-60', '61-80', '81-100'] as const

function riskBandIndex(score: number): number {
  if (score <= 20) return 0
  if (score <= 40) return 1
  if (score <= 60) return 2
  if (score <= 80) return 3
  return 4
}

export async function GET() {
  try {
    const [products, openFlags, criticalFlags, recentFlagRows, totalSearches, lastProduct, openFlagRows] =
      await Promise.all([
        db.product.findMany({ select: { id: true, category: true, riskScore: true, status: true } }),
        db.complianceFlag.count({ where: { status: 'OPEN' } }),
        db.complianceFlag.count({ where: { status: 'OPEN', severity: 'CRITICAL' } }),
        db.complianceFlag.findMany({
          where: { status: 'OPEN' },
          include: { product: true, rule: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 6,
        }),
        db.searchQuery.count(),
        db.product.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
        db.complianceFlag.findMany({
          where: { status: 'OPEN' },
          select: { product: { select: { category: true } } },
        }),
      ])

    const totalProducts = products.length
    const statusCounts: Record<string, number> = { PENDING: 0, APPROVED: 0, NEEDS_REVIEW: 0, REJECTED: 0 }
    const riskCounts = [0, 0, 0, 0, 0]
    for (const p of products) {
      // hasOwn: ignore unexpected statuses AND avoid touching prototype-chain keys
      if (Object.hasOwn(statusCounts, p.status)) statusCounts[p.status] += 1
      riskCounts[riskBandIndex(p.riskScore)] += 1
    }

    const avgRiskScore =
      totalProducts > 0
        ? Math.round(products.reduce((sum, p) => sum + p.riskScore, 0) / totalProducts)
        : 0
    const approved = statusCounts.APPROVED ?? 0
    const complianceRate = totalProducts > 0 ? Math.round((approved / totalProducts) * 1000) / 10 : 0

    const openFlagsByCategory = new Map<string, number>()
    for (const row of openFlagRows) {
      const category = row.product.category
      openFlagsByCategory.set(category, (openFlagsByCategory.get(category) ?? 0) + 1)
    }

    const categoryStats = CATEGORIES.map((category) => {
      const inCategory = products.filter((p) => p.category === category)
      const avgRisk =
        inCategory.length > 0
          ? Math.round((inCategory.reduce((sum, p) => sum + p.riskScore, 0) / inCategory.length) * 10) / 10
          : 0
      return {
        category,
        count: inCategory.length,
        avgRisk,
        openFlags: openFlagsByCategory.get(category) ?? 0,
      }
    })

    const stats: StatsDTO = {
      totalProducts,
      statusCounts,
      openFlags,
      criticalFlags,
      avgRiskScore,
      complianceRate,
      riskDistribution: RISK_BANDS.map((label, i) => ({ label, count: riskCounts[i] })),
      categoryStats,
      recentFlags: recentFlagRows.map(toFlagDTO),
      // Listings processed by the compliance scanner (anything not still PENDING).
      totalScans: products.filter((p) => p.status !== 'PENDING').length,
      totalSearches,
      lastScanAt: lastProduct ? lastProduct.updatedAt.toISOString() : null,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('GET /api/stats failed:', error)
    return NextResponse.json({ error: 'Failed to load statistics' }, { status: 500 })
  }
}
