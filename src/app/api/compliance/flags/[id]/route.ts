/**
 * SouqGuard AI — POST /api/compliance/flags/[id]
 *
 * Moderator action on an OPEN compliance flag.
 *   body: { action: 'RESOLVE' | 'DISMISS' }
 *
 * Marks the flag, then recomputes the product's risk score and moderation
 * status from its remaining OPEN flags. Returns the updated flag together with
 * the fresh product DTO.
 */

import { NextResponse } from 'next/server'
import type { ComplianceFlag, PolicyRule, Product } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { recomputeProductRisk } from '@/lib/compliance-engine'
import { toProductDTO, type FlagDTO, type FlagStatus, type Severity } from '@/lib/types'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  action: z.enum(['RESOLVE', 'DISMISS']),
})

async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text()
  if (!text.trim()) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const body = await readJsonBody(request)
    if (body === null) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid action — expected RESOLVE or DISMISS' }, { status: 400 })
    }
    const action = parsed.data.action

    const existing = await db.complianceFlag.findUnique({
      where: { id },
      include: { product: true, rule: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 })
    }
    if (existing.status !== 'OPEN') {
      return NextResponse.json({ error: 'Only OPEN flags can be resolved or dismissed' }, { status: 400 })
    }

    // The request action verb maps onto the flag status enum.
    const nextStatus: FlagStatus = action === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED'
    await db.complianceFlag.update({
      where: { id },
      data: { status: nextStatus, resolvedAt: new Date(), resolvedBy: 'moderator' },
    })

    // Risk score & moderation status react to the remaining OPEN flags.
    await recomputeProductRisk(existing.productId)

    const [updatedFlag, freshProduct, openCount] = await Promise.all([
      db.complianceFlag.findUnique({ where: { id }, include: { product: true, rule: true } }),
      db.product.findUnique({ where: { id: existing.productId } }),
      db.complianceFlag.count({ where: { productId: existing.productId, status: 'OPEN' } }),
    ])
    if (!updatedFlag || !freshProduct) {
      return NextResponse.json({ error: 'Failed to load updated flag' }, { status: 500 })
    }

    return NextResponse.json({
      flag: toFlagDTO(updatedFlag),
      product: toProductDTO(freshProduct, openCount),
    })
  } catch (error) {
    console.error('POST /api/compliance/flags/[id] failed:', error)
    return NextResponse.json({ error: 'Failed to update flag' }, { status: 500 })
  }
}
