'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react'

import { getDict, type Dictionary, type Locale } from '@/lib/i18n'

const STORAGE_KEY = 'souqguard-lang'

export type TranslationParams = Record<string, string | number>

interface I18nContextValue {
  lang: Locale
  dir: 'ltr' | 'rtl'
  isRTL: boolean
  t: (key: string, params?: TranslationParams) => string
  setLang: (lang: Locale) => void
  toggleLang: () => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

/* ------------------------------------------------------------------ */
/* Tiny external store backed by localStorage (with in-memory fallback) */
/* ------------------------------------------------------------------ */

const listeners = new Set<() => void>()
let memoryLang: Locale | null = null

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): Locale {
  if (memoryLang) return memoryLang
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en'
  } catch {
    return 'en'
  }
}

/** Server snapshot — always the default locale so SSR and hydration match. */
function getServerSnapshot(): Locale {
  return 'en'
}

function storeLang(lang: Locale): void {
  memoryLang = lang
  try {
    window.localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // localStorage unavailable — in-memory value still applies
  }
  for (const listener of listeners) listener()
}

/* ------------------------------------------------------------------ */
/* Dictionary helpers                                                    */
/* ------------------------------------------------------------------ */

function resolveKey(dict: Dictionary, key: string): string | undefined {
  let current: unknown = dict
  for (const part of key.split('.')) {
    if (
      current &&
      typeof current === 'object' &&
      part in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

function interpolate(
  template: string,
  params: TranslationParams | undefined
): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, token: string) =>
    token in params ? String(params[token]) : match
  )
}

/* ------------------------------------------------------------------ */
/* Provider                                                              */
/* ------------------------------------------------------------------ */

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Sync <html lang/dir> with the active locale (DOM = external system).
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const setLang = useCallback((next: Locale) => {
    storeLang(next)
  }, [])

  const toggleLang = useCallback(() => {
    storeLang(getSnapshot() === 'en' ? 'ar' : 'en')
  }, [])

  const t = useCallback(
    (key: string, params?: TranslationParams) => {
      const template = resolveKey(getDict(lang), key)
      if (template === undefined) return key
      return interpolate(template, params)
    },
    [lang]
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      isRTL: lang === 'ar',
      t,
      setLang,
      toggleLang,
    }),
    [lang, t, setLang, toggleLang]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within a LanguageProvider')
  }
  return ctx
}
