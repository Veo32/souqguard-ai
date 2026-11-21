/**
 * SouqGuard AI — GET /api/image/[id]
 *
 * Deterministic generative artwork for a product, derived from its 5-color
 * palette and category. Purely graphical SVG (no text), 800x600:
 *   - diagonal bg1→bg2 gradient background
 *   - 2-3 large soft blurred translucent ellipses (blob1/blob2, opacity 0.5-0.7)
 *     biased toward the corners so the center stays clear
 *   - a faint white radial glow lifting the focal point
 *   - one small accent circle/ring placed in a deliberate corner
 *   - a subtle category silhouette (lightened blob2 tint at 0.25 opacity)
 *   - tiny noise dots (positions hashed from the product id)
 *
 * The same product id always renders byte-identical SVG, so the response is
 * marked immutable and cached for a day.
 */

import { db } from '@/lib/db'
import { hexToRgb, rgbToHex, type Palette } from '@/lib/embeddings'

export const dynamic = 'force-dynamic'

const NEUTRAL_PALETTE: Palette = {
  bg1: '#E8E6E1',
  bg2: '#D6D3CE',
  blob1: '#C8C4BC',
  blob2: '#B6B2A9',
  accent: '#8A8578',
}

/** Validate a palette slot; anything that is not a hex color falls back. */
function safeHex(value: unknown, fallback: string): string {
  if (typeof value === 'string' && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value.trim())) {
    return value.trim().toUpperCase()
  }
  return fallback
}

function parsePalette(raw: string): Palette {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>
      return {
        bg1: safeHex(record.bg1, NEUTRAL_PALETTE.bg1),
        bg2: safeHex(record.bg2, NEUTRAL_PALETTE.bg2),
        blob1: safeHex(record.blob1, NEUTRAL_PALETTE.blob1),
        blob2: safeHex(record.blob2, NEUTRAL_PALETTE.blob2),
        accent: safeHex(record.accent, NEUTRAL_PALETTE.accent),
      }
    }
  } catch {
    // unparsable palette → neutral fallback
  }
  return { ...NEUTRAL_PALETTE }
}

/** FNV-1a hash of the product id — seeds the deterministic layout. */
function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Tiny deterministic LCG so the same id always produces the same layout. */
function makeRng(seed: number): () => number {
  let s = seed === 0 ? 0x9e3779b9 : seed
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Round to 1 decimal for clean, stable SVG output. */
function r1(value: number): number {
  return Math.round(value * 10) / 10
}

/** Mix a hex color toward white by `amount` (0 = unchanged, 1 = white). */
function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  const mix = (channel: number): number => Math.round(channel + (255 - channel) * amount)
  return rgbToHex(mix(r), mix(g), mix(b))
}

/** Abstract category silhouette — at most 4 primitive shapes, centered. */
function categorySilhouette(category: string, tint: string): string {
  switch (category) {
    case 'electronics':
      return (
        `<rect x="308" y="212" width="184" height="240" rx="30"/>` +
        `<line x1="400" y1="212" x2="400" y2="160" stroke="${tint}" stroke-width="12" stroke-linecap="round"/>` +
        `<circle cx="400" cy="144" r="17"/>`
      )
    case 'fashion':
      return (
        `<path d="M400 206 L272 376 L528 376 Z"/>` +
        `<circle cx="400" cy="180" r="18" fill="none" stroke="${tint}" stroke-width="13"/>`
      )
    case 'toys':
      return (
        `<rect x="292" y="352" width="216" height="64" rx="15"/>` +
        `<rect x="318" y="276" width="164" height="64" rx="15"/>` +
        `<rect x="344" y="200" width="112" height="64" rx="15"/>`
      )
    case 'home':
      return (
        `<path d="M400 178 C438 224 470 254 470 314 C470 374 446 404 446 404 L354 404 C354 404 330 374 330 314 C330 254 362 224 400 178 Z"/>` +
        `<rect x="346" y="404" width="108" height="22" rx="11"/>`
      )
    case 'beauty':
      return (
        `<path d="M400 166 C438 224 472 268 472 316 A72 72 0 1 1 328 316 C328 268 362 224 400 166 Z"/>` +
        `<circle cx="368" cy="322" r="16" fill="none" stroke="${tint}" stroke-width="11"/>`
      )
    case 'sports':
      return (
        `<circle cx="400" cy="266" r="74" fill="none" stroke="${tint}" stroke-width="28"/>` +
        `<rect x="288" y="358" width="224" height="42" rx="21"/>`
      )
    case 'grocery':
      return (
        `<ellipse cx="400" cy="304" rx="94" ry="150" transform="rotate(-26 400 304)"/>` +
        `<path d="M394 164 Q426 130 462 124" fill="none" stroke="${tint}" stroke-width="12" stroke-linecap="round"/>`
      )
    default:
      return `<circle cx="400" cy="300" r="130"/>`
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const product = await db.product.findUnique({
      where: { id },
      select: { id: true, palette: true, category: true },
    })
    if (!product) {
      return new Response('Product not found', { status: 404 })
    }

    const palette = parsePalette(product.palette)
    const tint = lighten(palette.blob2, 0.55)
    const rng = makeRng(hashId(product.id))

    // Large soft background clouds, biased toward the corners so the
    // central silhouette stays readable.
    const blobA = `<ellipse cx="${r1(30 + rng() * 130)}" cy="${r1(30 + rng() * 110)}" rx="${r1(
      200 + rng() * 80,
    )}" ry="${r1(150 + rng() * 70)}" fill="${palette.blob1}" opacity="${r1(0.55 + rng() * 0.15)}"/>`
    const blobB = `<ellipse cx="${r1(600 + rng() * 140)}" cy="${r1(430 + rng() * 110)}" rx="${r1(
      180 + rng() * 80,
    )}" ry="${r1(140 + rng() * 70)}" fill="${palette.blob2}" opacity="${r1(0.5 + rng() * 0.2)}"/>`
    let blobC = ''
    if (rng() > 0.4) {
      const color = rng() < 0.5 ? palette.blob1 : palette.blob2
      blobC = `<ellipse cx="${r1(330 + rng() * 260)}" cy="${r1(20 + rng() * 90)}" rx="${r1(
        110 + rng() * 70,
      )}" ry="${r1(80 + rng() * 50)}" fill="${color}" opacity="${r1(0.5 + rng() * 0.15)}"/>`
    }

    // One small accent circle or ring, placed as a counterweight near the
    // focal silhouette (upper-right or lower-left quadrant).
    const accentX = r1(rng() < 0.5 ? 560 + rng() * 120 : 110 + rng() * 140)
    const accentY = r1(rng() < 0.5 ? 110 + rng() * 150 : 380 + rng() * 130)
    const accentR = r1(24 + rng() * 28)
    const accent =
      rng() < 0.5
        ? `<circle cx="${accentX}" cy="${accentY}" r="${accentR}" fill="none" stroke="${palette.accent}" stroke-width="${r1(
            8 + rng() * 6,
          )}" opacity="0.9"/>`
        : `<circle cx="${accentX}" cy="${accentY}" r="${accentR}" fill="${palette.accent}" opacity="0.9"/>`

    // Subtle noise dots.
    const dotCount = 10 + Math.floor(rng() * 6)
    const dots: string[] = []
    for (let i = 0; i < dotCount; i++) {
      dots.push(`<circle cx="${r1(rng() * 800)}" cy="${r1(rng() * 600)}" r="${r1(1.5 + rng() * 2)}"/>`)
    }

    const svg =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" role="img">` +
      `<defs>` +
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${palette.bg1}"/>` +
      `<stop offset="1" stop-color="${palette.bg2}"/>` +
      `</linearGradient>` +
      `<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">` +
      `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>` +
      `<stop offset="0.65" stop-color="#FFFFFF" stop-opacity="0.08"/>` +
      `<stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>` +
      `</radialGradient>` +
      `<filter id="soft" x="-25%" y="-25%" width="150%" height="150%">` +
      `<feGaussianBlur stdDeviation="42"/>` +
      `</filter>` +
      `</defs>` +
      `<rect width="800" height="600" fill="url(#bg)"/>` +
      `<g filter="url(#soft)">${blobA}${blobB}${blobC}</g>` +
      `<ellipse cx="400" cy="300" rx="290" ry="230" fill="url(#glow)"/>` +
      accent +
      `<g fill="${tint}" opacity="0.25">${categorySilhouette(product.category, tint)}</g>` +
      `<g fill="#FFFFFF" opacity="0.15">${dots.join('')}</g>` +
      `</svg>`

    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (error) {
    console.error('GET /api/image/[id] failed:', error)
    return new Response('Failed to render artwork', { status: 500 })
  }
}
