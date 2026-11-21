/**
 * SouqGuard AI — GET /api/products/[id]
 *
 * Single product detail: the ProductDTO plus its full compliance-flag history
 * (all statuses, newest first).
 */

import { NextResponse } from 'next/server'
import type { ComplianceFlag, PolicyRule, Product } from '@prisma/client'
import { db } from '@/lib/db'
import { toProductDTO, type FlagDTO, type FlagStatus, type Severity } from '@/lib/types'

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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const product = await db.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const flags = await db.complianceFlag.findMany({
      where: { productId: id },
      include: { product: true, rule: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    const openCount = flags.filter((f) => f.status === 'OPEN').length

    return NextResponse.json({
      product: toProductDTO(product, openCount),
      flags: flags.map(toFlagDTO),
    })
  } catch (error) {
    console.error('GET /api/products/[id] failed:', error)
    return NextResponse.json({ error: 'Failed to load product' }, { status: 500 })
  }
}
