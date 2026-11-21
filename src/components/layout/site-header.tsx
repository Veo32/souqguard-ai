'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/contexts/language-context'
import { cn } from '@/lib/utils'

const subscribeNoop = (): (() => void) => () => {}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="souqguard-logo-gradient"
          x1="2"
          y1="2"
          x2="26"
          y2="26"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="26"
        height="26"
        rx="8"
        fill="url(#souqguard-logo-gradient)"
      />
      {/* Shield */}
      <path
        d="M14 6.4 19.8 8.5v4.8c0 3.5-2.4 6.3-5.8 7.7-3.4-1.4-5.8-4.2-5.8-7.7V8.5Z"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Eye inside the shield */}
      <path
        d="M11 13.6c1-1.6 2-2.2 3-2.2s2 .6 3 2.2c-1 1.6-2 2.2-3 2.2s-2-.6-3-2.2Z"
        fill="white"
      />
      <circle cx="14" cy="13.6" r="1.1" fill="#065f46" />
      {/* Spark */}
      <path
        d="M21 4.2c.3 1.1.8 1.6 1.9 1.9-1.1.3-1.6.8-1.9 1.9-.3-1.1-.8-1.6-1.9-1.9 1.1-.3 1.6-.8 1.9-1.9Z"
        fill="white"
      />
    </svg>
  )
}

export function SiteHeader() {
  const { lang, setLang, t } = useI18n()
  const { theme, setTheme } = useTheme()
  // next-themes reads localStorage only on the client; a server snapshot of
  // false + client snapshot of true gives us a hydration-safe "mounted" flag
  // without calling setState inside an effect.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  )
  const isDark = (mounted ? theme : undefined) === 'dark'

  const langButtonClass = (active: boolean) =>
    cn(
      'rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200',
      active
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    )

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-3">
          <LogoMark className="h-8 w-8 shrink-0 drop-shadow-sm" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold leading-tight tracking-tight text-foreground">
              {t('header.brand')}
            </span>
            <span
              dir="auto"
              className="hidden truncate text-[11px] leading-tight text-muted-foreground sm:block"
            >
              {t('header.subtitle')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <div
            role="group"
            aria-label={t('header.language')}
            className="flex items-center rounded-full border border-border/60 bg-card/50 p-0.5"
          >
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={langButtonClass(lang === 'en')}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('ar')}
              aria-pressed={lang === 'ar'}
              className={langButtonClass(lang === 'ar')}
            >
              عربي
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            aria-label={isDark ? t('header.themeLight') : t('header.themeDark')}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          >
            <Sun className="h-[1.15rem] w-[1.15rem] rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.15rem] w-[1.15rem] rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </header>
  )
}
