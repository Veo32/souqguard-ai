'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  Image as ImageIcon,
  ImageOff,
  Loader2,
  ScanSearch,
  Search,
  SearchX,
  Sparkles,
  Type,
  UploadCloud,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/shared/empty-state'
import { ProductImage } from '@/components/shared/product-image'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useI18n } from '@/contexts/language-context'
import { searchByImage, searchByText } from '@/lib/api-client'
import { imageDataToEmbedding, paletteToEmbedding, type Palette } from '@/lib/embeddings'
import type { SearchHit } from '@/lib/types'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Motion presets                                                      */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

const riseIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

/* ------------------------------------------------------------------ */
/* Client-side embedding pipeline                                      */
/* ------------------------------------------------------------------ */

const EMBED_SIZE = 32
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB

/**
 * Load an image URL (object URL or data URL), downscale it to 32×32 on an
 * offscreen canvas and convert the pixels into the shared 64-dim embedding.
 */
async function urlToEmbedding(url: string): Promise<number[]> {
  const image = new Image()
  image.decoding = 'async'
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('image load failed'))
    image.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = EMBED_SIZE
  canvas.height = EMBED_SIZE
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas 2D context unavailable')
  context.drawImage(image, 0, 0, EMBED_SIZE, EMBED_SIZE)
  const imageData = context.getImageData(0, 0, EMBED_SIZE, EMBED_SIZE)
  return imageDataToEmbedding(imageData.data, EMBED_SIZE, EMBED_SIZE)
}

/* ------------------------------------------------------------------ */
/* Sample swatches (inline SVG data URLs so the demo needs no uploads)  */
/* ------------------------------------------------------------------ */

interface Sample {
  id: string
  labelKey: string
  url: string
  palette: Palette
}

function makeSampleDataUrl(
  bg1: string,
  bg2: string,
  blob1: string,
  blob2: string,
  accent: string,
): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="96" height="96" fill="url(#g)"/>` +
    `<circle cx="32" cy="34" r="19" fill="${blob1}" fill-opacity="0.9"/>` +
    `<circle cx="63" cy="60" r="24" fill="${blob2}" fill-opacity="0.85"/>` +
    `<circle cx="68" cy="28" r="7" fill="${accent}"/>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const SAMPLES: Sample[] = [
  {
    id: 'crimson',
    labelKey: 'visualSearch.sampleCrimson',
    url: makeSampleDataUrl('#7F1D1D', '#DC2626', '#EF4444', '#F87171', '#FECACA'),
    palette: { bg1: '#7F1D1D', bg2: '#DC2626', blob1: '#EF4444', blob2: '#F87171', accent: '#FECACA' },
  },
  {
    id: 'emerald',
    labelKey: 'visualSearch.sampleEmerald',
    url: makeSampleDataUrl('#064E3B', '#059669', '#10B981', '#34D399', '#A7F3D0'),
    palette: { bg1: '#064E3B', bg2: '#059669', blob1: '#10B981', blob2: '#34D399', accent: '#A7F3D0' },
  },
  {
    id: 'navy',
    labelKey: 'visualSearch.sampleNavy',
    url: makeSampleDataUrl('#172554', '#1E3A8A', '#2563EB', '#60A5FA', '#DBEAFE'),
    palette: { bg1: '#172554', bg2: '#1E3A8A', blob1: '#2563EB', blob2: '#60A5FA', accent: '#DBEAFE' },
  },
  {
    id: 'amber',
    labelKey: 'visualSearch.sampleAmber',
    url: makeSampleDataUrl('#78350F', '#D97706', '#F59E0B', '#FBBF24', '#FEF3C7'),
    palette: { bg1: '#78350F', bg2: '#D97706', blob1: '#F59E0B', blob2: '#FBBF24', accent: '#FEF3C7' },
  },
  {
    id: 'rose',
    labelKey: 'visualSearch.sampleRose',
    url: makeSampleDataUrl('#881337', '#E11D48', '#F43F5E', '#FB7185', '#FECDD3'),
    palette: { bg1: '#881337', bg2: '#E11D48', blob1: '#F43F5E', blob2: '#FB7185', accent: '#FECDD3' },
  },
  {
    id: 'teal',
    labelKey: 'visualSearch.sampleTeal',
    url: makeSampleDataUrl('#134E4A', '#0D9488', '#14B8A6', '#2DD4BF', '#CCFBF1'),
    palette: { bg1: '#134E4A', bg2: '#0D9488', blob1: '#14B8A6', blob2: '#2DD4BF', accent: '#CCFBF1' },
  },
]

/* ------------------------------------------------------------------ */
/* Result card                                                         */
/* ------------------------------------------------------------------ */

function ResultCard({ hit }: { hit: SearchHit }) {
  const { t, lang } = useI18n()
  const product = hit.product
  const title = lang === 'ar' ? product.titleAr : product.title
  const pct = Math.max(0, Math.min(100, Math.round(hit.score * 100)))

  return (
    <motion.article
      variants={riseIn}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className="glass flex flex-col overflow-hidden rounded-2xl transition-shadow duration-300 hover:shadow-xl hover:shadow-emerald-500/10"
    >
      <div className="relative">
        <ProductImage
          productId={product.id}
          alt={title}
          className="aspect-square w-full"
          rounded="rounded-none"
        />
        <span
          className="absolute end-2 top-2 inline-flex items-center rounded-full bg-background/85 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-600 shadow-sm backdrop-blur dark:text-emerald-400"
          aria-label={`${t('visualSearch.similarityScore')}: ${pct}%`}
        >
          {pct}%
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h4 className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug" title={title}>
          {title}
        </h4>
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="max-w-[60%] truncate border-border/60 bg-muted/40 font-medium text-muted-foreground"
          >
            {t(`category.${product.category}`)}
          </Badge>
          <span className="text-sm font-bold tabular-nums">${product.price.toFixed(2)}</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{t('visualSearch.similarityScore')}</span>
            <span className="font-semibold tabular-nums text-foreground">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
              className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-400"
            />
          </div>
        </div>
        <div className="mt-auto flex flex-col gap-2.5 pt-1">
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground/80">
              {t('visualSearch.whyMatched')}:{' '}
            </span>
            {lang === 'ar' ? hit.matchReasonAr : hit.matchReasonEn}
          </p>
          <StatusBadge status={product.status} className="self-start" />
        </div>
      </div>
    </motion.article>
  )
}

/* ------------------------------------------------------------------ */
/* Results section (shared by both modes)                              */
/* ------------------------------------------------------------------ */

interface ResultsSectionProps {
  hits: SearchHit[] | null
  busy: boolean
  emptyTitle: string
  emptyIcon: 'image' | 'text'
}

function ResultsSection({ hits, busy, emptyTitle, emptyIcon }: ResultsSectionProps) {
  const { t } = useI18n()

  if (busy) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[3/4] w-full rounded-2xl bg-muted" />
        ))}
      </div>
    )
  }

  if (!hits) return null

  if (hits.length === 0) {
    return (
      <div className="glass rounded-2xl">
        <EmptyState
          icon={emptyIcon === 'image' ? ImageOff : SearchX}
          title={emptyTitle}
          className="py-12"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{t('visualSearch.resultsTitle')}</h3>
        <Badge variant="secondary" className="tabular-nums">
          {t('visualSearch.resultsCount', { count: hits.length })}
        </Badge>
      </div>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {hits.map((hit) => (
          <ResultCard key={hit.product.id} hit={hit} />
        ))}
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

type SearchMode = 'visual' | 'text'

export default function VisualSearchTab() {
  const { t } = useI18n()

  const [mode, setMode] = useState<SearchMode>('visual')
  const [dragging, setDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [visualBusy, setVisualBusy] = useState(false)
  const [visualHits, setVisualHits] = useState<SearchHit[] | null>(null)
  const [query, setQuery] = useState('')
  const [textBusy, setTextBusy] = useState(false)
  const [textHits, setTextHits] = useState<SearchHit[] | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const searchTokenRef = useRef(0)

  // Revoke the object URL when the tab unmounts.
  useEffect(() => {
    return () => {
      const url = previewUrlRef.current
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    }
  }, [])

  const setPreview = useCallback((url: string | null) => {
    const previous = previewUrlRef.current
    if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous)
    previewUrlRef.current = url
    setPreviewUrl(url)
  }, [])

  const runVisualSearch = useCallback(
    async (url: string) => {
      const token = ++searchTokenRef.current
      setVisualBusy(true)
      setVisualHits(null)
      try {
        const embedding = await urlToEmbedding(url)
        const response = await searchByImage(embedding)
        if (token !== searchTokenRef.current) return
        setVisualHits(response.results)
        toast.success(t('toast.searchComplete'), {
          description: t('visualSearch.resultsCount', { count: response.results.length }),
        })
      } catch (error) {
        if (token === searchTokenRef.current) {
          toast.error(
            error instanceof Error && error.message === 'image load failed'
              ? t('visualSearch.uploadFailed')
              : t('toast.loadError'),
          )
        }
      } finally {
        if (token === searchTokenRef.current) setVisualBusy(false)
      }
    },
    [t],
  )
  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return
      if (!file.type.startsWith('image/') || file.size > MAX_FILE_BYTES) {
        toast.error(t('visualSearch.fileInvalid'))
        return
      }
      const url = URL.createObjectURL(file)
      setPreview(url)
      void runVisualSearch(url)
    },
    [runVisualSearch, setPreview, t],
  )

  const handleSample = useCallback(
    (sample: Sample) => {
      setPreview(sample.url)
      // Sample swatches carry an explicit palette: embed it with the exact same
      // paletteToEmbedding transform the catalog uses, so sample searches compare
      // apples to apples (uploaded photos still go through the canvas pipeline).
      const token = ++searchTokenRef.current
      setVisualBusy(true)
      setVisualHits(null)
      void (async () => {
        try {
          const embedding = paletteToEmbedding(sample.palette)
          const response = await searchByImage(embedding)
          if (token !== searchTokenRef.current) return
          setVisualHits(response.results)
          toast.success(t('toast.searchComplete'), {
            description: t('visualSearch.resultsCount', { count: response.results.length }),
          })
        } catch {
          if (token === searchTokenRef.current) toast.error(t('toast.loadError'))
        } finally {
          if (token === searchTokenRef.current) setVisualBusy(false)
        }
      })()
    },
    [setPreview, t],
  )

  const clearVisual = useCallback(() => {
    searchTokenRef.current++
    setVisualBusy(false)
    setVisualHits(null)
    setPreview(null)
  }, [setPreview])

  const handleModeChange = useCallback(
    (value: string) => {
      if (value !== 'visual' && value !== 'text') return
      searchTokenRef.current++ // cancel any in-flight search updates
      setMode(value)
      setVisualHits(null)
      setTextHits(null)
      setVisualBusy(false)
      setTextBusy(false)
      setQuery('')
      setPreview(null)
    },
    [setPreview],
  )

  const runTextSearch = useCallback(
    async (rawQuery: string) => {
      const token = ++searchTokenRef.current
      setTextBusy(true)
      setTextHits(null)
      try {
        const response = await searchByText(rawQuery)
        if (token !== searchTokenRef.current) return
        setTextHits(response.results)
        toast.success(t('toast.searchComplete'), {
          description: t('visualSearch.resultsCount', { count: response.results.length }),
        })
      } catch {
        if (token === searchTokenRef.current) toast.error(t('toast.loadError'))
      } finally {
        if (token === searchTokenRef.current) setTextBusy(false)
      }
    },
    [t],
  )

  const handleTextSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmed = query.trim()
      if (!trimmed || textBusy) return
      void runTextSearch(trimmed)
    },
    [query, runTextSearch, textBusy],
  )

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  /* ---------------- render ---------------- */

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* ---------- Header ---------- */}
      <motion.header variants={riseIn} className="space-y-1">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl">
          <ScanSearch className="h-6 w-6 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
          {t('visualSearch.title')}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('visualSearch.subtitle')}</p>
      </motion.header>

      {/* ---------- Mode toggle + search panel ---------- */}
      <motion.div variants={riseIn}>
        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="h-11 rounded-full p-1">
            <TabsTrigger value="visual" className="rounded-full px-4 text-xs sm:px-5 sm:text-sm">
              <ImageIcon aria-hidden="true" />
              {t('visualSearch.visualTab')}
            </TabsTrigger>
            <TabsTrigger value="text" className="rounded-full px-4 text-xs sm:px-5 sm:text-sm">
              <Type aria-hidden="true" />
              {t('visualSearch.textTab')}
            </TabsTrigger>
          </TabsList>

          {/* ---------- Visual mode ---------- */}
          <TabsContent value="visual" className="mt-5">
            <div className="glass flex flex-col gap-6 rounded-2xl p-4 sm:p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  handleFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />

              {previewUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <ImageIcon
                        className="h-4 w-4 text-emerald-500 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                      {t('visualSearch.visualTab')}
                    </span>
                    <Button
                      variant="ghost"
                      className="h-9 text-muted-foreground hover:text-foreground"
                      onClick={clearVisual}
                    >
                      <X aria-hidden="true" />
                      {t('common.clear')}
                    </Button>
                  </div>
                  <div className="relative mx-auto w-fit">
                    <img
                      src={previewUrl}
                      alt={t('visualSearch.visualTab')}
                      className="max-h-48 rounded-xl border border-border/60"
                    />
                    {visualBusy ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/70 backdrop-blur-sm">
                        <Loader2
                          className="h-6 w-6 animate-spin text-emerald-500 dark:text-emerald-400"
                          aria-hidden="true"
                        />
                        <p className="text-xs font-medium text-foreground">
                          {t('visualSearch.analyzingImage')}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <motion.div
                  role="button"
                  tabIndex={0}
                  aria-label={t('visualSearch.dropzoneTitle')}
                  onClick={openFilePicker}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openFilePicker()
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault()
                    setDragging(false)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    setDragging(false)
                    handleFile(event.dataTransfer.files?.[0])
                  }}
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-10',
                    dragging
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border/70 bg-card/40 hover:border-emerald-500/60 hover:bg-emerald-500/5',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-2xl transition-colors',
                      dragging
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    <UploadCloud className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {t('visualSearch.dropzoneTitle')}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('visualSearch.dropzoneHint')}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full px-6"
                    onClick={(event) => {
                      event.stopPropagation()
                      openFilePicker()
                    }}
                  >
                    <UploadCloud aria-hidden="true" />
                    {t('visualSearch.browse')}
                  </Button>
                </motion.div>
              )}

              {/* ---------- Sample swatches ---------- */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('visualSearch.orTrySamples')}
                </p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {SAMPLES.map((sample) => (
                    <motion.button
                      key={sample.id}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleSample(sample)}
                      disabled={visualBusy}
                      aria-label={`${t('visualSearch.orTrySamples')}: ${t(sample.labelKey)}`}
                      className="group flex flex-col items-center gap-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="block w-full overflow-hidden rounded-xl border border-border/60 transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-emerald-500/10">
                        <img
                          src={sample.url}
                          alt={t(sample.labelKey)}
                          loading="lazy"
                          className="aspect-square w-full object-cover"
                        />
                      </span>
                      <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {t(sample.labelKey)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ---------- Text mode ---------- */}
          <TabsContent value="text" className="mt-5">
            <form
              onSubmit={handleTextSubmit}
              className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-6"
            >
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('visualSearch.textQueryPlaceholder')}
                  aria-label={t('visualSearch.textQueryPlaceholder')}
                  maxLength={200}
                  className="h-11 rounded-xl ps-9"
                />
              </div>
              <Button
                type="submit"
                className="h-11 rounded-xl px-6 font-semibold shadow-lg shadow-emerald-500/20"
                disabled={textBusy || !query.trim()}
                aria-label={t('visualSearch.searchBtn')}
              >
                {textBusy ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Search aria-hidden="true" />
                )}
                {t('visualSearch.searchBtn')}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ---------- Results ---------- */}
      <motion.section variants={riseIn} aria-label={t('visualSearch.resultsTitle')}>
        {mode === 'visual' ? (
          <ResultsSection
            hits={visualHits}
            busy={visualBusy}
            emptyTitle={t('visualSearch.noVisualResults')}
            emptyIcon="image"
          />
        ) : (
          <ResultsSection
            hits={textHits}
            busy={textBusy}
            emptyTitle={t('visualSearch.noTextResults')}
            emptyIcon="text"
          />
        )}
      </motion.section>

      {/* ---------- Footer note ---------- */}
      <motion.p
        variants={riseIn}
        className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"
      >
        <Sparkles
          className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400"
          aria-hidden="true"
        />
        {t('visualSearch.poweredBy')}
      </motion.p>
    </motion.div>
  )
}
