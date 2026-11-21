'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { CircleAlert, Flag, RotateCw, Scale, ScrollText, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/shared/empty-state'
import { SeverityBadge } from '@/components/shared/severity-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/contexts/language-context'
import { apiGet, pickLocalized } from '@/lib/api-client-e'
import type { PolicyDTO, Severity } from '@/lib/types'
import { cn } from '@/lib/utils'

type SeverityFilter = Severity | 'ALL'

const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

/** Logical start-border accent per severity (RTL-aware via border-s-*). */
const SEVERITY_ACCENT: Record<Severity, string> = {
  CRITICAL: 'border-s-rose-500',
  HIGH: 'border-s-orange-500',
  MEDIUM: 'border-s-amber-500',
  LOW: 'border-s-teal-500',
}

/** ruleCategory (DB value) → i18n key under policies.* */
const RULE_CATEGORY_KEYS: Record<string, string> = {
  restricted: 'policies.catRestricted',
  authenticity: 'policies.catAuthenticity',
  content: 'policies.catContent',
  safety: 'policies.catSafety',
  'fair-pricing': 'policies.catFairPricing',
  'listing-quality': 'policies.catListingQuality',
  quality: 'policies.catQuality',
}

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

/* ------------------------------ sub-components ---------------------------- */

function PolicyCardSkeleton() {
  return (
    <div className="h-full overflow-hidden rounded-2xl border-s-4 border-s-muted/60">
      <Card className="h-full gap-3 rounded-2xl border-border/60 bg-card/60 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20 rounded-full bg-muted" />
          <Skeleton className="h-6 w-14 rounded-full bg-muted" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-2/3 bg-muted" />
          <Skeleton className="h-3.5 w-24 bg-muted" />
        </div>
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-5/6 bg-muted" />
        <div className="mt-auto space-y-3">
          <Skeleton className="h-6 w-28 rounded-full bg-muted" />
          <Skeleton className="h-4 w-full bg-muted" />
        </div>
      </Card>
    </div>
  )
}

function LoadErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-500/25 bg-card/60 py-14 text-center backdrop-blur-xl">
      <CircleAlert className="h-8 w-8 text-rose-500" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{message}</p>
      <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onRetry}>
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        {t('common.retry')}
      </Button>
    </div>
  )
}

function SeverityChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          : 'border-border/60 bg-card/60 text-muted-foreground backdrop-blur-xl hover:bg-foreground/5 hover:text-foreground'
      )}
    >
      {label}
    </button>
  )
}

function PolicyCard({ policy }: { policy: PolicyDTO }) {
  const { lang, t } = useI18n()
  const name = pickLocalized(policy.nameEn, policy.nameAr, lang)
  const description = pickLocalized(policy.descriptionEn, policy.descriptionAr, lang)
  const categoryKey = RULE_CATEGORY_KEYS[policy.ruleCategory]

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="h-full"
    >
      <div
        className={cn(
          'h-full rounded-2xl border-s-4',
          SEVERITY_ACCENT[policy.severity] ?? 'border-s-teal-500'
        )}
      >
        <Card className="h-full gap-3 rounded-2xl border-border/60 bg-card/60 p-5 backdrop-blur-xl transition-shadow duration-300 hover:shadow-lg hover:shadow-black/5">
          {/* Top row — severity + active state */}
          <div className="flex items-center justify-between gap-2">
            <SeverityBadge severity={policy.severity} />
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                policy.active
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  policy.active ? 'bg-emerald-500' : 'bg-zinc-400'
                )}
                aria-hidden="true"
              />
              {policy.active ? t('policies.active') : t('policies.inactive')}
            </span>
          </div>

          {/* Rule name + code */}
          <div className="space-y-1">
            <h3 className="text-base font-semibold leading-snug text-foreground">{name}</h3>
            <code dir="ltr" className="font-mono text-xs text-muted-foreground">
              {policy.code}
            </code>
          </div>

          {/* Description */}
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          {/* Footer stats */}
          <div className="mt-auto space-y-3 pt-1">
            {categoryKey ? (
              <Badge
                variant="secondary"
                className="rounded-full bg-muted/60 text-xs font-medium text-muted-foreground"
              >
                {t(categoryKey)}
              </Badge>
            ) : null}
            <Separator />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                title={t('policies.riskWeight')}
              >
                <Scale className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                {t('policies.riskWeight')}
                <span dir="ltr" className="font-semibold tabular-nums text-foreground/80">
                  {policy.weight}
                </span>
              </span>
              <span
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                title={t('policies.flagsTriggered')}
              >
                <Flag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t('policies.flagsTriggered')}
                <span dir="ltr" className="font-semibold tabular-nums text-foreground/80">
                  {policy.flagCount}
                </span>
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs',
                  policy.openFlagCount > 0
                    ? 'font-medium text-rose-600 dark:text-rose-400'
                    : 'text-muted-foreground'
                )}
                title={t('policies.openFlags')}
              >
                <ShieldAlert
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                {t('policies.openFlags')}
                <span dir="ltr" className="font-semibold tabular-nums">
                  {policy.openFlagCount}
                </span>
              </span>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  )
}

/* --------------------------------- the tab -------------------------------- */

export default function PoliciesTab() {
  const { t } = useI18n()
  const [policies, setPolicies] = useState<PolicyDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await apiGet<{ policies: PolicyDTO[] }>('/api/policies')
      setPolicies(data.policies)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (error) toast.error(t('toast.loadError'))
  }, [error, t])

  const filtered = useMemo(
    () =>
      severityFilter === 'ALL'
        ? policies
        : policies.filter((policy) => policy.severity === severityFilter),
    [policies, severityFilter]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t('policies.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('policies.subtitle')}</p>
        </div>
        <Badge
          variant="secondary"
          className="gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-muted-foreground backdrop-blur-xl"
        >
          <ScrollText className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
          <span className="font-semibold text-foreground">{loading ? '…' : policies.length}</span>
          {t('common.total')}
        </Badge>
      </div>

      {/* Severity filter chips (client-side over the 9 rules) */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('compliance.severity')}>
        <SeverityChip
          label={t('compliance.allSeverities')}
          active={severityFilter === 'ALL'}
          onClick={() => setSeverityFilter('ALL')}
        />
        {SEVERITIES.map((item) => (
          <SeverityChip
            key={item}
            label={t(`severity.${item}`)}
            active={severityFilter === item}
            onClick={() => setSeverityFilter(item)}
          />
        ))}
      </div>

      {/* Grid */}
      <div aria-live="polite">
        {loading ? (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            role="status"
            aria-busy="true"
          >
            <span className="sr-only">{t('common.loading')}</span>
            {Array.from({ length: 6 }).map((_, i) => (
              <PolicyCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <LoadErrorPanel message={t('common.error')} onRetry={() => void load()} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={ScrollText} title={t('common.noResults')} />
        ) : (
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
