/**
 * SouqGuard AI — tiny typed fetch helpers shared by the dashboard and visual
 * search tabs. All requests use RELATIVE URLs so they work behind the gateway,
 * and failures surface as plain `Error`s with a readable message.
 */

import type { ProductDTO, SearchResponse, StatsDTO } from '@/lib/types'

interface ApiErrorBody {
  error?: unknown
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object') {
      const message = (body as ApiErrorBody).error
      if (typeof message === 'string' && message.length > 0) return message
    }
  } catch {
    // Body was not JSON — fall through to the status text below.
  }
  return `${response.status} ${response.statusText}`.trim() || `HTTP ${response.status}`
}

/** GET a JSON resource. Throws an `Error` with the server message on !ok. */
export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(await responseMessage(response))
  return (await response.json()) as T
}

/** POST a JSON body. Throws an `Error` with the server message on !ok. */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!response.ok) throw new Error(await responseMessage(response))
  return (await response.json()) as T
}

/* ------------------------------------------------------------------ */
/* Typed endpoint wrappers used by the dashboard & visual search tabs   */
/* ------------------------------------------------------------------ */

export interface ScanResponse {
  scanned: number
  flagged: number
  flagsCreated: number
}

export interface ProductsResponse {
  products: ProductDTO[]
  total: number
}

export function fetchStats(): Promise<StatsDTO> {
  return getJson<StatsDTO>('/api/stats')
}

export function fetchProductsByRisk(): Promise<ProductsResponse> {
  return getJson<ProductsResponse>('/api/products?sort=risk')
}

export function runComplianceScan(): Promise<ScanResponse> {
  return postJson<ScanResponse>('/api/compliance/scan', {})
}

export function searchByImage(embedding: number[]): Promise<SearchResponse> {
  return postJson<SearchResponse>('/api/search', { mode: 'VISUAL', embedding })
}

export function searchByText(text: string): Promise<SearchResponse> {
  return postJson<SearchResponse>('/api/search', { mode: 'TEXT', text })
}
