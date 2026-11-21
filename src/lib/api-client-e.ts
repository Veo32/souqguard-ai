/**
 * SouqGuard AI — Agent 2-e local helpers.
 *
 * A tiny typed fetch wrapper plus locale-aware date / number formatting
 * shared by the compliance, catalog and policies tabs. Kept separate from
 * `api-client.ts` (owned by Agent 2-d) to avoid edit conflicts.
 *
 * All requests use RELATIVE paths only ('/api/...').
 */
import { format, formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'

/** Minimal shape of the `t()` function from useI18n(). */
export type TFunc = (key: string, params?: Record<string, string | number>) => string

/* ------------------------------ fetch helpers ----------------------------- */

/** GET a JSON endpoint, throwing on non-2xx so callers can toast + retry. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`)
  return (await res.json()) as T
}

/** POST a JSON body, throwing on non-2xx. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} failed with ${res.status}`)
  return (await res.json()) as T
}

/* ------------------------------- date helpers ----------------------------- */

/** Locale-aware relative time, e.g. "3 days ago" / "منذ 3 أيام" (Western digits). */
export function relativeTime(iso: string, lang: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: lang === 'ar' ? ar : enUS,
  })
}

/** Locale-aware absolute date, e.g. "20 Nov 2026" / "20 نوفمبر 2026". */
export function absoluteDate(iso: string, lang: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return format(date, 'd MMM yyyy', { locale: lang === 'ar' ? ar : enUS })
}

/* ------------------------------ format helpers ---------------------------- */

/** Currency with Western digits, e.g. "$1,299.00" (safe fallback on bad codes). */
export function formatPrice(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `$${value.toFixed(2)}`
  }
}

/** Pick the localized variant with a graceful fallback to the other language. */
export function pickLocalized(en: string, ar: string, lang: string): string {
  if (lang === 'ar') return ar || en
  return en || ar
}

/** `t('category.<key>')` with a graceful fallback for unknown categories. */
export function categoryLabel(t: TFunc, category: string): string {
  const key = `category.${category}`
  const label = t(key)
  return label === key ? category : label
}
