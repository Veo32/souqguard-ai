/**
 * SouqGuard AI — GET /api/policies
 *
 * The full policy rulebook with enforcement statistics. Rules are ordered by
 * severity rank (CRITICAL > HIGH > MEDIUM > LOW), then by code; each carries
 * its total flag count and open flag count.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { PolicyDTO, Severity } from '@/lib/types'

export const dynamic = 'force-dynamic'

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

/** Rank a severity for ordering; unknown severities sort last. */
function severityRank(severity: string): number {
  // hasOwn guard so prototype-chain keys ("constructor" etc.) can never leak in
  return Object.hasOwn(SEVERITY_RANK, severity) ? SEVERITY_RANK[severity] : 99
}

export async function GET() {
  try {
    const [rules, allFlagGroups, openFlagGroups] = await Promise.all([
      db.policyRule.findMany(),
      db.complianceFlag.groupBy({
        by: ['ruleId'],
        _count: { _all: true },
      }),
      db.complianceFlag.groupBy({
        by: ['ruleId'],
        _count: { _all: true },
        where: { status: 'OPEN' },
      }),
    ])

    const flagCounts = new Map(allFlagGroups.map((g) => [g.ruleId, g._count._all]))
    const openFlagCounts = new Map(openFlagGroups.map((g) => [g.ruleId, g._count._all]))

    const policies: PolicyDTO[] = rules
      .map((rule) => ({
        id: rule.id,
        code: rule.code,
        nameEn: rule.nameEn,
        nameAr: rule.nameAr,
        descriptionEn: rule.descriptionEn,
        descriptionAr: rule.descriptionAr,
        ruleCategory: rule.ruleCategory,
        severity: rule.severity as Severity,
        weight: rule.weight,
        active: rule.active,
        flagCount: flagCounts.get(rule.id) ?? 0,
        openFlagCount: openFlagCounts.get(rule.id) ?? 0,
      }))
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.code.localeCompare(b.code))

    return NextResponse.json({ policies })
  } catch (error) {
    console.error('GET /api/policies failed:', error)
    return NextResponse.json({ error: 'Failed to load policies' }, { status: 500 })
  }
}
