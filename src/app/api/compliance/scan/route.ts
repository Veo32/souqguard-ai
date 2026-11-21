/**
 * SouqGuard AI — POST /api/compliance/scan
 *
 * Run the policy compliance engine. With `{ productId }` a single listing is
 * scanned; with an empty body the whole catalog is scanned. The response
 * summarizes how many listings were scanned, how many ended up with open
 * flags, and how many new flags were created.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { runFullScan, scanProduct } from '@/lib/compliance-engine'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  productId: z.string().min(1).max(64).optional(),
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

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request)
    if (body === null) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid scan request — expected { productId?: string }' }, { status: 400 })
    }

    if (parsed.data.productId) {
      const productId = parsed.data.productId
      const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } })
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      const result = await scanProduct(productId)
      return NextResponse.json({
        scanned: 1,
        flagged: result.openFlags > 0 ? 1 : 0,
        flagsCreated: result.flagsCreated,
      })
    }

    const result = await runFullScan()
    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/compliance/scan failed:', error)
    return NextResponse.json({ error: 'Compliance scan failed' }, { status: 500 })
  }
}
