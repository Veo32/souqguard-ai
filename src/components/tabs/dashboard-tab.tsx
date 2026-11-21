'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ar as arDateLocale, enUS } from 'date-fns/locale'
import { motion, type Variants } from 'framer-motion'
import {
  AlertCircle,
  BadgeCheck,
  Blocks,
  Clock,
  Coffee,
  Dumbbell,
  Flag,
  Gauge,
  LayoutGrid,
  Loader2,
  Package,
  RefreshCw,
  ScanSearch,
  Shirt,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sofa,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'

import { CountUp } from '@/components/shared/count-up'
import { EmptyState } from '@/components/shared/empty-state'
import { ProductImage } from '@/components/shared/product-image'
import { RiskGauge } from '@/components/shared/risk-gauge'
import { SeverityBadge } from '@/components/shared/severity-badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/contexts/language-context'
import { fetchProductsByRisk, fetchStats, runComplianceScan } from '@/lib/api-client'
import type { ProductDTO, StatsDTO } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Props & shared constants                                             */
/* ------------------------------------------------------------------ */

type NavigateTarget = 'visualSearch' | 'compliance'

interface DashboardTabProps {
  onNavigate?: (tab: NavigateTarget) => void
}

type BandKey = 'b1' | 'b2' | 'b3' | 'b4' | 'b5'

/** Bar color per risk band — emerald (minimal) → amber → orange → rose → rose (critical). */
const BAND_COLORS: Record<BandKey, string> = {
  b1: '#F43F5E',
  b2: '#FB7185',
  b3: '#FB923C',
  b4: '#F59E0B',
  b5: '#10B981',
}

/** lucide icon per category (mirrors CATEGORY_META icon names). */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronics: Smartphone,
  fashion: Shirt,
  toys: Blocks,
  home: Sofa,
  beauty: Sparkles,
  sports: Dumbbell,
  grocery: Coffee,
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

const riseIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

/* ------------------------------------------------------------------ */
/* Pure helpers                                                         */
/* ------------------------------------------------------------------ */

/** '0-20' → b5 … '81-100' → b1 (band keys follow the i18n riskBands tree). */
function bandKeyFromRangeLabel(label: string): BandKey {
  const upper = Number(label.split('-').pop())
  if (Number.isFinite(upper)) {
    if (upper <= 20) return 'b5'
    if (upper <= 40) return 'b4'
    if (upper <= 60) return 'b3'
    if (upper <= 80) return 'b2'
  }
  return 'b1'
}

/** Risk score 0-100 → band key (b5 minimal … b1 critical). */
function bandKeyFromScore(score: number): BandKey {
  if (score >= 80) return 'b1'
  if (score >= 60) return 'b2'
  if (score >= 40) return 'b3'
  if (score >= 20) return 'b4'
  return 'b5'
}

interface RiskTone {
  text: string
  chip: string
  bar: string
}

/** Tailwind classes per risk level — full literals so the scanner keeps them. */
function riskTone(score: number): RiskTone {
  if (score >= 75)
    return {
      text: 'text-rose-500 dark:text-rose-400',
      chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      bar: 'bg-rose-500',
    }
  if (score >= 50)
    return {
      text: 'text-orange-500 dark:text-orange-400',
      chip: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      bar: 'bg-orange-500',
    }
  if (score >= 25)
    return {
      text: 'text-amber-500 dark:text-amber-400',
      chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      bar: 'bg-amber-500',
    }
  return {
    text: 'text-emerald-600 dark:text-emerald-400',
    chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  }
}

/** Normalize a compliance rate that may arrive as 0-1 or 0-100 into percent. */
function toPercent(rate: number): number {
  if (!Number.isFinite(rate)) return 0
  return rate <= 1 ? rate * 100 : rate
}

/* ------------------------------------------------------------------ */
/* Chart                                                                */
/* ------------------------------------------------------------------ */

interface ChartDatum {
  bandKey: BandKey
  name: string
  range: string
  count: number
  fill: string
}

function RiskChartTooltip({ active, payload }: TooltipProps<number, string>) {
  const { t } = useI18n()
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0]?.payload as ChartDatum | undefined
  if (!datum) return null
  return (
    <div className="glass rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-foreground">{datum.name}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {datum.count} {t('dashboard.listings')} · {datum.range.replace('-', '–')}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Stat card                                                            */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  icon: LucideIcon
  chipClass: string
  label: string
  value: React.ReactNode
  valueClass?: string
  sub: string
}

function StatCard({ icon: Icon, chipClass, label, value, valueClass, sub }: StatCardProps) {
  return (
    <motion.div
      variants={riseIn}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className="h-full"
    >
      <div className="glass flex h-full flex-col gap-3 rounded-2xl p-4 transition-shadow duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', chipClass)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="mt-auto space-y-1">
          <p className={cn('text-2xl font-bold leading-none tabular-nums sm:text-[1.7rem]', valueClass)}>
            {value}
          </p>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-[11px] text-muted-foreground/70" title={sub}>
            {sub}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                     */
/* ------------------------------------------------------------------ */

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 bg-muted" />
          <Skeleton className="h-4 w-80 max-w-full bg-muted" />
        </div>
        <Skeleton className="h-11 w-44 rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[132px] rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-[360px] rounded-2xl bg-muted lg:col-span-3" />
        <Skeleton className="h-[360px] rounded-2xl bg-muted lg:col-span-2" />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-80 rounded-2xl bg-muted lg:col-span-3" />
        <Skeleton className="h-80 rounded-2xl bg-muted lg:col-span-2" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */

export default function DashboardTab({ onNavigate }: DashboardTabProps) {
  const { t, lang } = useI18n()
  const dateLocale = lang === 'ar' ? arDateLocale : enUS

  // Keep a live translation function for stable callbacks (toasts in catches).
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  }, [t])

  const [stats, setStats] = useState<StatsDTO | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [topProducts, setTopProducts] = useState<ProductDTO[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(null)
    try {
      setStats(await fetchStats())
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : 'Unexpected error')
      toast.error(tRef.current('toast.loadError'))
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadTopProducts = useCallback(async () => {
    setProductsLoading(true)
    setProductsError(null)
    try {
      const response = await fetchProductsByRisk()
      setTopProducts(response.products.slice(0, 3))
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : 'Unexpected error')
    } finally {
      setProductsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  useEffect(() => {
    void loadTopProducts()
  }, [loadTopProducts])

  // Cross-tab navigation. Falls back to activating the shell tab button when
  // the host does not wire onNavigate (page.tsx renders tabs without props).
  const navigate = useCallback(
    (target: NavigateTarget) => {
      if (onNavigate) {
        onNavigate(target)
        return
      }
      document.getElementById(`tab-${target}`)?.click()
    },
    [onNavigate],
  )

  const runScan = useCallback(async () => {
    setScanning(true)
    const toastId = toast.loading(tRef.current('toast.scanStarted'))
    try {
      const result = await runComplianceScan()
      toast.success(tRef.current('dashboard.scanComplete'), {
        id: toastId,
        description: tRef.current('dashboard.scanSummary', {
          scanned: result.scanned,
          flags: result.flagsCreated,
        }),
      })
      await Promise.all([loadStats(), loadTopProducts()])
    } catch {
      toast.error(tRef.current('toast.loadError'), { id: toastId })
    } finally {
      setScanning(false)
    }
  }, [loadStats, loadTopProducts])

  const timeAgo = useCallback(
    (iso: string | null): string => {
      if (!iso) return tRef.current('dashboard.never')
      try {
        return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: dateLocale })
      } catch {
        return tRef.current('dashboard.never')
      }
    },
    [dateLocale],
  )

  const chartData = useMemo<ChartDatum[]>(() => {
    if (!stats) return []
    return stats.riskDistribution.map((band) => {
      const bandKey = bandKeyFromRangeLabel(band.label)
      return {
        bandKey,
        range: band.label,
        name: t(`dashboard.riskBands.${bandKey}`),
        count: band.count,
        fill: BAND_COLORS[bandKey],
      }
    })
  }, [stats, t])

  const categoryRows = useMemo(() => {
    if (!stats) return []
    return [...stats.categoryStats].sort((a, b) => b.count - a.count)
  }, [stats])

  /* ---------------- render ---------------- */

  if (statsLoading && !stats) {
    return (
      <div>
        <DashboardSkeleton />
        <p className="sr-only">{t('common.loading')}</p>
      </div>
    )
  }

  if (statsError && !stats) {
    return (
      <Card className="glass rounded-2xl">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10">
            <AlertCircle className="h-7 w-7 text-rose-500" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{t('common.error')}</p>
            <p className="max-w-sm text-xs text-muted-foreground">{statsError}</p>
          </div>
          <Button variant="outline" className="h-11" onClick={() => void loadStats()}>
            <RefreshCw aria-hidden="true" />
            {t('common.retry')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const pendingCount = stats?.statusCounts?.PENDING ?? 0
  const needsReviewCount = stats?.statusCounts?.NEEDS_REVIEW ?? 0
  const approvedCount = stats?.statusCounts?.APPROVED ?? 0
  const avgRisk = stats?.avgRiskScore ?? 0
  const compliancePct = toPercent(stats?.complianceRate ?? 0)
  const openFlags = stats?.openFlags ?? 0
  const criticalFlags = stats?.criticalFlags ?? 0
  const avgTone = riskTone(avgRisk)
  const recentFlags = (stats?.recentFlags ?? []).slice(0, 5)

  const statCards: StatCardProps[] = [
    {
      icon: LayoutGrid,
      chipClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      label: t('dashboard.statTotalListings'),
      value: <CountUp value={stats?.totalProducts ?? 0} />,
      sub: `${t('dashboard.lastScanAt')}: ${timeAgo(stats?.lastScanAt ?? null)}`,
    },
    {
      icon: Clock,
      chipClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      label: t('dashboard.statPendingReview'),
      value: <CountUp value={pendingCount} />,
      sub: `${needsReviewCount} ${t('status.NEEDS_REVIEW')}`,
    },
    {
      icon: ShieldAlert,
      chipClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      label: t('dashboard.statOpenFlags'),
      value: <CountUp value={openFlags} />,
      sub: t('dashboard.criticalFlagsShort', { count: criticalFlags }),
    },
    {
      icon: Gauge,
      chipClass: avgTone.chip,
      label: t('dashboard.statAvgRisk'),
      value: <CountUp value={avgRisk} decimals={0} />,
      valueClass: avgTone.text,
      sub: t(`dashboard.riskBands.${bandKeyFromScore(avgRisk)}`),
    },
    {
      icon: BadgeCheck,
      chipClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
      label: t('dashboard.statComplianceRate'),
      value: <CountUp value={compliancePct} decimals={1} suffix="%" />,
      valueClass: 'text-emerald-600 dark:text-emerald-400',
      sub: `${approvedCount} ${t('status.APPROVED')}`,
    },
  ]

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* ---------- Header ---------- */}
      <motion.header variants={riseIn} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t('dashboard.title')}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <Button
          size="lg"
          className="h-11 rounded-full px-5 font-semibold shadow-lg shadow-emerald-500/20"
          onClick={() => void runScan()}
          disabled={scanning}
          aria-busy={scanning}
        >
          {scanning ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <ScanSearch aria-hidden="true" />
          )}
          {scanning ? t('dashboard.scanning') : t('dashboard.runFullScan')}
        </Button>
      </motion.header>

      {/* ---------- Stat cards ---------- */}
      <motion.div
        variants={stagger}
        className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5"
      >
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </motion.div>

      {/* ---------- Risk distribution + recent flags ---------- */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-5">
        <motion.section variants={riseIn} className="min-w-0 lg:col-span-3" aria-label={t('dashboard.riskDistribution')}>
          <Card className="glass h-full rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t('dashboard.riskDistribution')}</CardTitle>
              <CardDescription>{t('dashboard.riskDistributionSub')}</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <EmptyState icon={LayoutGrid} title={t('common.noResults')} className="py-10" />
              ) : (
                <>
                  <div className="h-[240px] w-full" role="img" aria-label={t('dashboard.riskDistribution')}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} stroke="#52525b" strokeOpacity={0.18} strokeDasharray="4 4" />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={{ stroke: '#52525b', strokeOpacity: 0.35 }}
                          tick={{ fill: '#a1a1aa', fontSize: 11 }}
                          tickFormatter={(value: unknown) => String(value).split(' (')[0]}
                          interval={0}
                          tickMargin={8}
                        />
                        <YAxis
                          allowDecimals={false}
                          width={36}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#a1a1aa', fontSize: 11 }}
                        />
                        <RechartsTooltip
                          cursor={{ fill: 'rgba(113, 113, 122, 0.08)' }}
                          content={<RiskChartTooltip />}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={800}>
                          {chartData.map((entry) => (
                            <Cell key={entry.range} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
                    {chartData.map((entry) => (
                      <span
                        key={entry.range}
                        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.fill }}
                          aria-hidden="true"
                        />
                        {entry.range.replace('-', '–')}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.section>

        <motion.section variants={riseIn} className="min-w-0 lg:col-span-2" aria-label={t('dashboard.recentFlags')}>
          <Card className="glass h-full rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t('dashboard.recentFlags')}</CardTitle>
              <CardDescription>{t('dashboard.recentFlagsSub')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {recentFlags.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  title={t('compliance.noFlagsTitle')}
                  description={t('compliance.noFlagsSub')}
                  className="py-8"
                />
              ) : (
                <motion.ul
                  variants={stagger}
                  className="max-h-96 space-y-1 overflow-y-auto pe-1"
                >
                  {recentFlags.map((flag) => (
                    <motion.li
                      key={flag.id}
                      variants={riseIn}
                      className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-foreground/5"
                    >
                      <SeverityBadge severity={flag.severity} className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-snug">
                          {lang === 'ar' ? flag.productTitleAr : flag.productTitle}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {lang === 'ar' ? flag.ruleNameAr : flag.ruleNameEn}
                        </p>
                      </div>
                      <time className="shrink-0 pt-0.5 text-[11px] text-muted-foreground/80">
                        {timeAgo(flag.createdAt)}
                      </time>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </CardContent>
            <div className="px-6 pb-6">
              <Button
                variant="ghost"
                className="h-11 w-full text-muted-foreground hover:text-foreground"
                onClick={() => navigate('compliance')}
              >
                <Flag aria-hidden="true" />
                {t('dashboard.viewAllFlags')}
              </Button>
            </div>
          </Card>
        </motion.section>
      </div>

      {/* ---------- Category overview + top risky listings ---------- */}
      <div className="grid gap-6 lg:grid-cols-5">
        <motion.section variants={riseIn} className="lg:col-span-3" aria-label={t('dashboard.categoryOverview')}>
          <Card className="glass h-full rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t('dashboard.categoryOverview')}</CardTitle>
              <CardDescription>{t('dashboard.categoryOverviewSub')}</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading && categoryRows.length === 0 ? (
                <div className="space-y-5" aria-hidden="true">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <Skeleton key={index} className="h-9 w-full bg-muted" />
                  ))}
                </div>
              ) : categoryRows.length === 0 ? (
                <EmptyState icon={Package} title={t('common.noResults')} className="py-8" />
              ) : (
                <motion.div variants={stagger} className="space-y-4">
                  {categoryRows.map((row) => {
                    const Icon = CATEGORY_ICONS[row.category] ?? Package
                    const tone = riskTone(row.avgRisk)
                    return (
                      <motion.div key={row.category} variants={riseIn} className="flex items-center gap-3 sm:gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium">
                              {t(`category.${row.category}`)}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {row.count} {t('dashboard.listings')}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-3">
                            <div className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-muted">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(3, Math.min(100, row.avgRisk))}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.25 }}
                                className={cn('h-full rounded-full', tone.bar)}
                              />
                            </div>
                            <span
                              className={cn(
                                'w-8 shrink-0 text-end text-sm font-bold tabular-nums',
                                tone.text,
                              )}
                              aria-label={`${t('dashboard.riskScore')}: ${Math.round(row.avgRisk)}`}
                            >
                              {Math.round(row.avgRisk)}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          aria-label={`${row.openFlags} ${t('dashboard.openFlags')}`}
                          className={cn(
                            'shrink-0 gap-1 tabular-nums',
                            row.openFlags > 0
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'border-border/60 bg-transparent text-muted-foreground',
                          )}
                        >
                          <Flag className="h-3 w-3" aria-hidden="true" />
                          {row.openFlags}
                        </Badge>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.section>

        <motion.section variants={riseIn} className="lg:col-span-2" aria-label={t('dashboard.topRiskListings')}>
          <Card className="glass h-full rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t('dashboard.topRiskListings')}</CardTitle>
              <CardDescription>{t('dashboard.topRiskSub')}</CardDescription>
            </CardHeader>
            <CardContent>
              {productsLoading && topProducts.length === 0 ? (
                <div className="space-y-3" aria-hidden="true">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-[68px] w-full rounded-2xl bg-muted" />
                  ))}
                </div>
              ) : productsError ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <AlertCircle className="h-6 w-6 text-rose-500" aria-hidden="true" />
                  <p className="text-xs text-muted-foreground">{productsError}</p>
                  <Button variant="outline" size="sm" onClick={() => void loadTopProducts()}>
                    <RefreshCw aria-hidden="true" />
                    {t('common.retry')}
                  </Button>
                </div>
              ) : topProducts.length === 0 ? (
                <EmptyState icon={Package} title={t('common.noResults')} className="py-8" />
              ) : (
                <motion.div variants={stagger} className="space-y-3">
                  {topProducts.map((product) => {
                    const title = lang === 'ar' ? product.titleAr : product.title
                    return (
                      <motion.button
                        key={product.id}
                        type="button"
                        variants={riseIn}
                        whileHover={{ y: -2 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                        onClick={() => navigate('compliance')}
                        className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-start transition-shadow duration-300 hover:shadow-lg hover:shadow-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`${title} — ${t('dashboard.riskScore')}: ${product.riskScore}`}
                      >
                        <ProductImage
                          productId={product.id}
                          alt={title}
                          className="h-12 w-12 shrink-0"
                          rounded="rounded-xl"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-snug">{title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={product.status} />
                            <span className="text-[11px] text-muted-foreground">
                              {t(`category.${product.category}`)}
                            </span>
                          </div>
                        </div>
                        <RiskGauge score={product.riskScore} size={44} />
                      </motion.button>
                    )
                  })}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </motion.div>
  )
}
