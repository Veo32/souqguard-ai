/**
 * SouqGuard AI — GET /api/compliance/flags
 *
 * Compliance-flag feed with optional exact-match filters:
 *   ?status=     OPEN | RESOLVED | DISMISSED
 *   ?severity=   CRITICAL | HIGH | MEDIUM | LOW
 *   ?productId=  product id (max 64 chars)
 *
 * Newest first, limit 100. Without filters all statuses are returned.
 */

import { NextResponse } from 'next/server'
import type { ComplianceFlag, PolicyRule, Product } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import type { FlagDTO, FlagStatus, Severity } from '@/lib/types'

export const dynamic = 'force-dynamic'

const FLAG_STATUSES = ['OPEN', 'RESOLVED', 'DISMISSED'] as const
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const

const querySchema = z.object({
  status: z.enum(FLAG_STATUSES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  productId: z.string().min(1).max(64).optional(),
})

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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const parsed = querySchema.safeParse({
      status: url.searchParams.get('status') ?? undefined,
      severity: url.searchParams.get('severity') ?? undefined,
      productId: url.searchParams.get('productId') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }
    const { status, severity, productId } = parsed.data

    const where: { status?: string; severity?: string; productId?: string } = {}
    if (status) where.status = status
    if (severity) where.severity = severity
    if (productId) where.productId = productId

    const flags = await db.complianceFlag.findMany({
      where,
      include: { product: true, rule: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    })

    return NextResponse.json({ flags: flags.map(toFlagDTO) })
  } catch (error) {
    console.error('GET /api/compliance/flags failed:', error)
    return NextResponse.json({ error: 'Failed to load flags' }, { status: 500 })
  }
}
