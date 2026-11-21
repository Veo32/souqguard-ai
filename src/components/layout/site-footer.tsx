'use client'

import { useI18n } from '@/contexts/language-context'

function FooterMark({ className }: { className?: string }) {
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
          id="souqguard-footer-gradient"
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
        fill="url(#souqguard-footer-gradient)"
      />
      <path
        d="M14 6.4 19.8 8.5v4.8c0 3.5-2.4 6.3-5.8 7.7-3.4-1.4-5.8-4.2-5.8-7.7V8.5Z"
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11 13.6c1-1.6 2-2.2 3-2.2s2 .6 3 2.2c-1 1.6-2 2.2-3 2.2s-2-.6-3-2.2Z"
        fill="white"
      />
      <circle cx="14" cy="13.6" r="1.1" fill="#065f46" />
    </svg>
  )
}

export function SiteFooter() {
  const { t } = useI18n()

  return (
    <footer className="mt-auto w-full border-t border-border/60 bg-card/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-between">
          {/* Brand + tagline */}
          <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-start">
            <div className="flex items-center gap-2">
              <FooterMark className="h-5 w-5" />
              <span className="text-sm font-bold tracking-tight text-foreground">
                {t('header.brand')}
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Dataset + tech credit */}
          <div className="flex flex-col items-center gap-1.5 text-center md:items-end md:text-end">
            <p className="text-sm text-muted-foreground">
              {t('footer.dataset')}{' '}
              <span className="font-medium text-foreground">
                {t('footer.datasetName')}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{t('footer.tech')}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © 2026 {t('common.appName')} — {t('footer.rights')}
          </p>
          <p className="hidden sm:block">{t('common.appTagline')}</p>
        </div>
      </div>
    </footer>
  )
}
