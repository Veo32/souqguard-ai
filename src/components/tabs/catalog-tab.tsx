'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  CheckCircle2,
  CircleAlert,
  Flag,
  Package,
  PackageOpen,
  RotateCw,
} from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/shared/empty-state'
import { ProductImage } from '@/components/shared/product-image'
import { RiskGauge } from '@/components/shared/risk-gauge'
import { SeverityBadge } from '@/components/shared/severity-badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/contexts/language-context'
import {
  absoluteDate,
  apiGet,
  categoryLabel,
  formatPrice,
  pickLocalized,
  relativeTime,
} from '@/lib/api-client-e'
import type { FlagDTO, ProductDTO, ProductStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

type SortKey = 'newest' | 'risk' | 'price_asc' | 'price_desc'
type StatusFilter = ProductStatus | 'ALL'

const CATEGORIES = [
  'electronics',
  'fashion',
  'toys',
  'home',
  'beauty',
  'sports',
  'grocery',
] as const

const PRODUCT_STATUSES: ProductStatus[] = ['PENDING', 'APPROVED', 'NEEDS_REVIEW', 'REJECTED']

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

/* ------------------------------ sub-components ---------------------------- */

function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 bg-card/60 backdrop-blur-xl">
      <Skeleton className="aspect-square w-full rounded-none bg-muted" />
      <CardContent className="space-y-3 p-4">
        <Skeleton className="h-5 w-24 rounded-full bg-muted" />
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-2/3 bg-muted" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20 bg-muted" />
          <Skeleton className="h-5 w-16 rounded-full bg-muted" />
        </div>
        <Skeleton className="h-11 w-full bg-muted" />
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

function OpenFlagsChip({ count }: { count: number }) {
  const { t } = useI18n()
  if (count <= 0) return null
  return (
    <Badge className="gap-1 rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-600 hover:bg-rose-500/15 dark:text-rose-400">
      <Flag className="h-3 w-3" aria-hidden="true" />
      <span dir="ltr" className="tabular-nums">
        {count}
      </span>
      <span className="sr-only">{t('catalog.openFlags')}</span>
    </Badge>
  )
}

interface ProductCardProps {
  product: ProductDTO
  onOpen: (product: ProductDTO) => void
}

function ProductCard({ product, onOpen }: ProductCardProps) {
  const { lang, t } = useI18n()
  const title = pickLocalized(product.title, product.titleAr, lang)

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="h-full"
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${t('catalog.viewListing')}: ${title}`}
        onClick={() => onOpen(product)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen(product)
          }
        }}
        className="h-full cursor-pointer rounded-2xl outline-none transition-shadow duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Card className="h-full overflow-hidden rounded-2xl border-border/60 bg-card/60 backdrop-blur-xl transition-[border-color,box-shadow] duration-300 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/40">
          <ProductImage
            productId={product.id}
            alt={title}
            className="aspect-square w-full"
            rounded="rounded-t-2xl"
          />
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={product.status} />
              <OpenFlagsChip count={product.openFlags} />
            </div>

            <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug text-foreground">
              {title}
            </h3>
            <p className="truncate text-xs text-muted-foreground">{product.brand}</p>

            <div className="flex items-center justify-between gap-2">
              <span dir="ltr" className="text-base font-bold tabular-nums text-foreground">
                {formatPrice(product.price, product.currency)}
              </span>
              <Badge
                variant="secondary"
                className="rounded-full bg-muted/60 text-xs font-medium text-muted-foreground"
              >
                {categoryLabel(t, product.category)}
              </Badge>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <RiskGauge score={product.riskScore} size={40} />
              <span className="text-xs font-medium text-muted-foreground">
                {t('catalog.riskScore')}
              </span>
              <span className="ms-auto text-end">
                <span className="block text-[11px] text-muted-foreground">
                  {t('catalog.listedOn')}
                </span>
                <span className="text-xs font-medium text-foreground/80">
                  {relativeTime(product.listingDate, lang)}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

function InfoItem({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        dir={ltr ? 'ltr' : undefined}
        className={cn('truncate text-sm font-medium text-foreground', ltr && 'text-start')}
      >
        {value}
      </p>
    </div>
  )
}

/* --------------------------------- the tab -------------------------------- */

export default function CatalogTab() {
  const { lang, t } = useI18n()
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [total, setTotal] = useState(0)
  const [category, setCategory] = useState<string>('ALL')
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [sort, setSort] = useState<SortKey>('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [selected, setSelected] = useState<ProductDTO | null>(null)
  const [detail, setDetail] = useState<{ flags: FlagDTO[] } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(false)
  const [detailNonce, setDetailNonce] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams()
      if (category !== 'ALL') params.set('category', category)
      if (status !== 'ALL') params.set('status', status)
      params.set('sort', sort)
      const data = await apiGet<{ products: ProductDTO[]; total: number }>(
        `/api/products?${params.toString()}`
      )
      setProducts(data.products)
      setTotal(data.total)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [category, status, sort])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (error) toast.error(t('toast.loadError'))
  }, [error, t])

  // Fetch the full product detail (with its flags) whenever the dialog opens.
  useEffect(() => {
    if (!selected) {
      setDetail(null)
      setDetailError(false)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    setDetailError(false)
    setDetail(null)
    apiGet<{ product: ProductDTO; flags: FlagDTO[] }>(`/api/products/${selected.id}`)
      .then((data) => {
        if (!cancelled) setDetail({ flags: data.flags })
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null)
          setDetailError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selected, detailNonce])

  const closeDialog = () => setSelected(null)

  const selectedTitle = selected
    ? pickLocalized(selected.title, selected.titleAr, lang)
    : ''
  const selectedDescription = selected
    ? pickLocalized(selected.description, selected.descriptionAr, lang)
    : ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t('catalog.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('catalog.subtitle')}</p>
        </div>
        <Badge
          variant="secondary"
          className="gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-muted-foreground backdrop-blur-xl"
        >
          <Package className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
          <span className="font-semibold text-foreground">{loading ? '…' : total}</span>
          {t('common.total')}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-11 w-48 rounded-xl" aria-label={t('catalog.category')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('catalog.allCategories')}</SelectItem>
            {CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {t(`category.${item}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger className="h-11 w-48 rounded-xl" aria-label={t('catalog.status')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('catalog.allStatuses')}</SelectItem>
            {PRODUCT_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {t(`status.${item}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="h-11 w-48 rounded-xl" aria-label={t('catalog.sort')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('catalog.sortNewest')}</SelectItem>
            <SelectItem value="risk">{t('catalog.sortRisk')}</SelectItem>
            <SelectItem value="price_asc">{t('catalog.sortPriceLow')}</SelectItem>
            <SelectItem value="price_desc">{t('catalog.sortPriceHigh')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div aria-live="polite">
        {loading ? (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            role="status"
            aria-busy="true"
          >
            <span className="sr-only">{t('common.loading')}</span>
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <LoadErrorPanel message={t('common.error')} onRetry={() => void load()} />
        ) : products.length === 0 ? (
          <EmptyState icon={PackageOpen} title={t('catalog.noProducts')} />
        ) : (
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onOpen={setSelected} />
            ))}
          </motion.div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={selected !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[85vh] gap-4 overflow-y-auto rounded-2xl sm:max-w-2xl">
          {selected ? (
            <div className="space-y-4">
              <ProductImage
                productId={selected.id}
                alt={selectedTitle}
                className="h-48 w-full"
                rounded="rounded-xl"
              />

              <div className="space-y-2">
                <DialogTitle className="text-start text-lg font-bold leading-snug">
                  {selectedTitle}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-muted/60 text-xs font-medium text-muted-foreground"
                  >
                    {categoryLabel(t, selected.category)}
                  </Badge>
                  <OpenFlagsChip count={selected.openFlags} />
                </div>
              </div>

              <DialogDescription className="text-start text-sm leading-relaxed">
                {selectedDescription}
              </DialogDescription>

              <Separator />

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                <InfoItem label={t('catalog.brand')} value={selected.brand} />
                <InfoItem label={t('catalog.seller')} value={selected.sellerName} />
                <InfoItem label={t('catalog.country')} value={selected.sellerCountry} />
                <InfoItem
                  label={t('catalog.price')}
                  value={formatPrice(selected.price, selected.currency)}
                  ltr
                />
                <InfoItem
                  label={t('catalog.listedOn')}
                  value={absoluteDate(selected.listingDate, lang)}
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('catalog.category')}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {(selected.palette ?? []).slice(0, 5).map((hex, i) => (
                      <span
                        key={`${hex}-${i}`}
                        title={hex}
                        className="h-5 w-5 rounded-full border border-border"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Risk + status */}
              <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                <RiskGauge score={selected.riskScore} size={56} />
                <div className="flex flex-col items-start gap-1.5">
                  <span className="text-xs text-muted-foreground">{t('catalog.riskScore')}</span>
                  <StatusBadge status={selected.status} />
                </div>
                <span className="ms-auto text-end">
                  <span className="block text-[11px] text-muted-foreground">
                    {t('catalog.listedOn')}
                  </span>
                  <span className="text-xs font-medium text-foreground/80">
                    {absoluteDate(selected.listingDate, lang)}
                  </span>
                </span>
              </div>

              <Separator />

              {/* Flags */}
              <div className="space-y-2.5">
                <p className="text-sm font-semibold text-foreground">
                  {t('compliance.flagsFound', {
                    count: detailLoading ? '…' : (detail?.flags.length ?? 0),
                  })}
                </p>

                {detailLoading ? (
                  <div className="space-y-2.5" role="status" aria-busy="true">
                    <span className="sr-only">{t('common.loading')}</span>
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-xl bg-muted" />
                    ))}
                  </div>
                ) : detailError ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/25 px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">{t('common.error')}</span>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-lg"
                      onClick={() => setDetailNonce((n) => n + 1)}
                    >
                      <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.retry')}
                    </Button>
                  </div>
                ) : !detail || detail.flags.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-500"
                      aria-hidden="true"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('catalog.openFlags')}
                      <span aria-hidden="true">: </span>
                      <span dir="ltr" className="font-semibold tabular-nums">
                        0
                      </span>
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2.5 pe-2">
                      {detail.flags.map((flag) => (
                        <div
                          key={flag.id}
                          className="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <SeverityBadge severity={flag.severity} />
                            <span className="text-xs font-semibold text-foreground">
                              {pickLocalized(flag.ruleNameEn, flag.ruleNameAr, lang)}
                            </span>
                            <StatusBadge status={flag.status} className="ms-auto" />
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {pickLocalized(flag.reasonEn, flag.reasonAr, lang)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
