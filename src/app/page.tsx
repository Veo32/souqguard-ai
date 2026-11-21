'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import {
  Languages,
  LayoutDashboard,
  LayoutGrid,
  Package,
  ScanSearch,
  ScrollText,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import CatalogTab from '@/components/tabs/catalog-tab'
import ComplianceTab from '@/components/tabs/compliance-tab'
import DashboardTab from '@/components/tabs/dashboard-tab'
import PoliciesTab from '@/components/tabs/policies-tab'
import VisualSearchTab from '@/components/tabs/visual-search-tab'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/contexts/language-context'
import { cn } from '@/lib/utils'

type TabKey = 'dashboard' | 'visualSearch' | 'compliance' | 'catalog' | 'policies'

interface TabConfigItem {
  key: TabKey
  icon: LucideIcon
}

const TABS: readonly TabConfigItem[] = [
  { key: 'dashboard', icon: LayoutDashboard },
  { key: 'visualSearch', icon: ScanSearch },
  { key: 'compliance', icon: ShieldCheck },
  { key: 'catalog', icon: LayoutGrid },
  { key: 'policies', icon: ScrollText },
]

const HERO_STATS: Array<{ key: 'stat1' | 'stat2' | 'stat3'; icon: LucideIcon }> = [
  { key: 'stat1', icon: Package },
  { key: 'stat2', icon: ShieldCheck },
  { key: 'stat3', icon: Languages },
]

const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}

const heroItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export default function Home() {
  const { t, isRTL } = useI18n()
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    dashboard: null,
    visualSearch: null,
    compliance: null,
    catalog: null,
    policies: null,
  })

  const handleTablistKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const count = TABS.length
    const currentIndex = TABS.findIndex((tab) => tab.key === activeTab)
    const forwardKey = isRTL ? 'ArrowLeft' : 'ArrowRight'
    const backKey = isRTL ? 'ArrowRight' : 'ArrowLeft'
    let nextIndex: number | null = null

    if (event.key === forwardKey) nextIndex = (currentIndex + 1) % count
    else if (event.key === backKey) nextIndex = (currentIndex - 1 + count) % count
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = count - 1

    if (nextIndex === null) return
    event.preventDefault()
    const nextKey = TABS[nextIndex].key
    setActiveTab(nextKey)
    tabRefs.current[nextKey]?.focus()
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />
      case 'visualSearch':
        return <VisualSearchTab />
      case 'compliance':
        return <ComplianceTab />
      case 'catalog':
        return <CatalogTab />
      case 'policies':
        return <PoliciesTab />
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="grid-pattern pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_65%_65%_at_50%_0%,black_25%,transparent_75%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl dark:bg-emerald-500/20"
          />

          <motion.div
            variants={heroContainer}
            initial="hidden"
            animate="show"
            className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-12 pt-14 text-center sm:px-6 sm:pt-20"
          >
            <motion.span
              variants={heroItem}
              className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
              {t('hero.badge')}
            </motion.span>

            <motion.h1
              variants={heroItem}
              className="mt-6 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl"
            >
              {t('hero.title1')}{' '}
              <span className="text-gradient">{t('hero.title2')}</span>
            </motion.h1>

            <motion.p
              variants={heroItem}
              className="mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base"
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.div
              variants={heroItem}
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
            >
              {HERO_STATS.map(({ key, icon: Icon }) => (
                <span
                  key={key}
                  className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  <Icon className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                  {t(`hero.${key}`)}
                </span>
              ))}
            </motion.div>

            <motion.div variants={heroItem} className="mt-8">
              <Button
                size="lg"
                className="rounded-full px-6 text-sm font-semibold shadow-lg shadow-emerald-500/20"
                onClick={() => setActiveTab('visualSearch')}
              >
                <ScanSearch />
                {t('hero.ctaScan')}
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* ---------- Tab navigation ---------- */}
        <nav aria-label={t('common.appName')} className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <div className="flex justify-center">
            <div className="glass no-scrollbar max-w-full overflow-x-auto rounded-full p-1">
              <div
                role="tablist"
                aria-orientation="horizontal"
                onKeyDown={handleTablistKeyDown}
                className="flex w-max items-center gap-1"
              >
                {TABS.map(({ key, icon: Icon }) => {
                  const active = activeTab === key
                  return (
                    <button
                      key={key}
                      ref={(node) => {
                        tabRefs.current[key] = node
                      }}
                      type="button"
                      role="tab"
                      id={`tab-${key}`}
                      aria-selected={active}
                      aria-controls={`tabpanel-${key}`}
                      tabIndex={active ? 0 : -1}
                      onClick={() => setActiveTab(key)}
                      className={cn(
                        'relative isolate shrink-0 rounded-full px-4 py-2 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        active
                          ? 'text-primary-foreground'
                          : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="active-tab-pill"
                          className="absolute inset-0 -z-10 rounded-full bg-linear-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/25"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {t(`nav.${key}`)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </nav>

        {/* ---------- Tab content ---------- */}
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {renderActiveTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
