'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  CheckCircle2,
  CircleAlert,
  Fingerprint,
  History,
  Loader2,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/shared/empty-state'
import { ProductImage } from '@/components/shared/product-image'
import { SeverityBadge } from '@/components/shared/severity-badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/contexts/language-context'
import {
  absoluteDate,
  apiGet,
  apiPost,
  categoryLabel,
  formatPrice,
  pickLocalized,
  relativeTime,
} from '@/lib/api-client-e'
import type { FlagDTO, FlagStatus, Severity } from '@/lib/types'
import { cn } from '@/lib/utils'

type FlagAction = 'RESOLVE' | 'DISMISS'
type StatusFilter = FlagStatus | 'ALL'
type SeverityFilter = Severity | 'ALL'

const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const FLAG_STATUSES: FlagStatus[] = ['OPEN', 'RESOLVED', 'DISMISSED']

/** Evidence keys we know how to label — see i18n `compliance.evidenceKeys.*`. */
const EVIDENCE_KEYS = [
  'term',
  'context',
  'mentionedColors',
  'dominantColors',
  'distance',
  'categoryAvg',
  'price',
  'ratio',
  'required',
  'matchedCategory',
  'score',
  'meanLuminance',
  'meanSaturation',
] as const

type EvidenceKey = (typeof EVIDENCE_KEYS)[number]

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function formatEvidenceValue(key: EvidenceKey, value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ')
  if (typeof value === 'number') {
    if (key === 'price') return formatPrice(value)
    if (key === 'ratio') return `${Math.round(value * 100)}%`
    return String(Math.round(value * 100) / 100)
  }
  return String(value)
}

function shorten(value: string): string {
  return value.length > 24 ? `${value.slice(0, 23)}…` : value
}

/* ------------------------------ sub-components ---------------------------- */

function FlagCardSkeleton() {
  return (
    <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur-xl">
      <CardContent className="flex gap-4 p-4 sm:p-5">
        <Skeleton className="h-16 w-16 shrink-0 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-5 w-1/3 bg-muted" />
          <Skeleton className="h-4 w-1/2 bg-muted" />
          <Skeleton className="h-4 w-2/3 bg-muted" />
          <Skeleton className="h-9 w-64 max-w-full bg-muted" />
        </div>
      </CardContent>
    </Card>
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

interface FlagCardProps {
  flag: FlagDTO
  acting: { id: string; action: FlagAction } | null
  onAction: (flag: FlagDTO, action: FlagAction) => void
}

function FlagCard({ flag, acting, onAction }: FlagCardProps) {
  const { lang, t } = useI18n()
  const title = pickLocalized(flag.productTitle, flag.productTitleAr, lang)
  const ruleName = pickLocalized(flag.ruleNameEn, flag.ruleNameAr, lang)
  const reason = pickLocalized(flag.reasonEn, flag.reasonAr, lang)
  const confidencePct = Math.max(0, Math.min(100, Math.round((flag.confidence ?? 0) * 100)))

  const chips = EVIDENCE_KEYS.map((key) => {
    const evidence = (flag.evidence ?? {}) as Record<string, unknown>
    let value = evidence[key]
    // Localize raw evidence values where an Arabic counterpart exists.
    if (key === 'required' && lang === 'ar' && typeof evidence.requiredAr === 'string') {
      value = evidence.requiredAr
    }
    if (key === 'matchedCategory' && typeof value === 'string') {
      value = categoryLabel(t, value)
    }
    return { key, value }
  }).filter((chip) => chip.value !== undefined && chip.value !== null && chip.value !== '')

  const isActing = acting?.id === flag.id

  return (
    <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur-xl transition-shadow duration-300 hover:shadow-lg hover:shadow-black/5">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <ProductImage
          productId={flag.productId}
          alt={title}
          className="h-16 w-16 shrink-0"
          rounded="rounded-lg"
        />

        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Row 1 — rule identity */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <SeverityBadge severity={flag.severity} />
            <StatusBadge status={flag.status} />
            <span className="text-sm font-semibold text-foreground">{ruleName}</span>
            <span
              className="ms-auto whitespace-nowrap text-xs text-muted-foreground"
              title={absoluteDate(flag.createdAt, lang)}
            >
              {relativeTime(flag.createdAt, lang)}
            </span>
          </div>

          {/* Row 2 — product */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="max-w-full truncate text-sm font-medium text-foreground">{title}</span>
            <Badge
              variant="secondary"
              className="rounded-full bg-muted/60 text-xs font-medium text-muted-foreground"
            >
              {categoryLabel(t, flag.productCategory)}
            </Badge>
            <span dir="ltr" className="text-xs font-semibold tabular-nums text-muted-foreground">
              {formatPrice(flag.productPrice)}
            </span>
          </div>

          {/* Row 3 — reason */}
          <p className="text-sm leading-relaxed text-muted-foreground">{reason}</p>

          {/* Row 4 — confidence */}
          <div className="flex items-center gap-2.5">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {t('compliance.confidence')}
            </span>
            <div
              className="h-1.5 w-28 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${t('compliance.confidence')}: ${confidencePct}%`}
            >
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${confidencePct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span dir="ltr" className="text-xs font-semibold tabular-nums text-foreground/80">
              {confidencePct}%
            </span>
          </div>

          {/* Evidence chips */}
          {chips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <Fingerprint
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
                aria-hidden="true"
              />
              <span className="sr-only">{t('compliance.evidence')}</span>
              {chips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex max-w-64 items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  <span className="shrink-0 font-medium text-foreground/70">
                    {t(`compliance.evidenceKeys.${chip.key}`)}
                  </span>
                  {chip.key === 'dominantColors' && Array.isArray(chip.value) ? (
                    <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
                      {chip.value.slice(0, 4).map((color, i) => (
                        <span
                          key={`${String(color)}-${i}`}
                          className="h-2.5 w-2.5 rounded-full border border-foreground/20"
                          style={{ backgroundColor: String(color) }}
                        />
                      ))}
                    </span>
                  ) : null}
                  <span dir="auto" className="truncate">
                    {shorten(formatEvidenceValue(chip.key, chip.value))}
                  </span>
                </span>
              ))}
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {flag.status === 'OPEN' ? (
              <>
                <Button
                  type="button"
                  className="h-11 rounded-xl font-semibold sm:h-10"
                  disabled={acting !== null}
                  onClick={() => onAction(flag, 'RESOLVE')}
                >
                  {isActing && acting?.action === 'RESOLVE' ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  {t('compliance.resolve')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl sm:h-10"
                  disabled={acting !== null}
                  onClick={() => onAction(flag, 'DISMISS')}
                >
                  {isActing && acting?.action === 'DISMISS' ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                  )}
                  {t('compliance.dismiss')}
                </Button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <History className="h-3.5 w-3.5" aria-hidden="true" />
                {t(`flagStatus.${flag.status}`)}
                <span aria-hidden="true">·</span>
                {relativeTime(flag.resolvedAt ?? flag.createdAt, lang)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* --------------------------------- the tab -------------------------------- */

export default function ComplianceTab() {
  const { t } = useI18n()
  const [flags, setFlags] = useState<FlagDTO[]>([])
  const [severity, setSeverity] = useState<SeverityFilter>('ALL')
  const [status, setStatus] = useState<StatusFilter>('OPEN')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [acting, setActing] = useState<{ id: string; action: FlagAction } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams()
      if (status !== 'ALL') params.set('status', status)
      if (severity !== 'ALL') params.set('severity', severity)
      const qs = params.toString()
      const data = await apiGet<{ flags: FlagDTO[] }>(
        `/api/compliance/flags${qs ? `?${qs}` : ''}`
      )
      setFlags(data.flags)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [status, severity])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (error) toast.error(t('toast.loadError'))
  }, [error, t])

  const handleAction = useCallback(
    async (flag: FlagDTO, action: FlagAction) => {
      if (acting) return
      setActing({ id: flag.id, action })
      try {
        await apiPost(`/api/compliance/flags/${flag.id}`, { action })
        toast.success(action === 'RESOLVE' ? t('toast.flagResolved') : t('toast.flagDismissed'))
        await load()
      } catch {
        toast.error(t('common.error'))
      } finally {
        setActing(null)
      }
    },
    [acting, load, t]
  )

  const sortedFlags = useMemo(
    () => [...flags].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [flags]
  )

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t('compliance.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('compliance.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            {t('compliance.flagsFound', { count: loading ? '…' : flags.length })}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl"
            onClick={() => void load()}
            disabled={loading}
            aria-label={t('common.refresh')}
          >
            <RotateCw
              className={cn('h-4 w-4', loading && 'animate-spin')}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={severity}
          onValueChange={(value) => setSeverity(value as SeverityFilter)}
        >
          <SelectTrigger
            className="h-11 w-48 rounded-xl"
            aria-label={t('compliance.severity')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('compliance.allSeverities')}</SelectItem>
            {SEVERITIES.map((item) => (
              <SelectItem key={item} value={item}>
                {t(`severity.${item}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger className="h-11 w-48 rounded-xl" aria-label={t('compliance.status')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('compliance.allStatuses')}</SelectItem>
            {FLAG_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {t(`flagStatus.${item}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Body */}
      <div aria-live="polite">
        {loading ? (
          <div className="space-y-4" role="status" aria-busy="true">
            <span className="sr-only">{t('common.loading')}</span>
            {Array.from({ length: 4 }).map((_, i) => (
              <FlagCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <LoadErrorPanel message={t('common.error')} onRetry={() => void load()} />
        ) : flags.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={t('compliance.noFlagsTitle')}
            description={t('compliance.noFlagsSub')}
          />
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {sortedFlags.map((flag) => (
              <motion.div key={flag.id} variants={itemVariants} whileHover={{ y: -3 }}>
                <FlagCard flag={flag} acting={acting} onAction={handleAction} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
