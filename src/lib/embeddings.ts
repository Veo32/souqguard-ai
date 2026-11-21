/**
 * SouqGuard AI — Color-based visual embeddings (framework-free, pure TypeScript).
 *
 * Products are represented by a 5-color palette that also drives their generated
 * artwork. Both palettes and raw canvas pixels are converted into a shared 64-dim
 * embedding space so visual search can compare an uploaded photo against catalog
 * palettes with cosine similarity.
 *
 * Embedding layout (64 dims, whole vector sums to ~1):
 *  - dims 0-15:  Red channel 16-bin histogram   (normalized to sum 1/3)
 *  - dims 16-31: Green channel 16-bin histogram (normalized to sum 1/3)
 *  - dims 32-47: Blue channel 16-bin histogram  (normalized to sum 1/3)
 *  - dims 48-63: 4x4 luminance grid (mean luminance / 255 per cell)
 */

export const EMBEDDING_DIM = 64

export interface Palette {
  bg1: string
  bg2: string
  blob1: string
  blob2: string
  accent: string
}

/** Weights of each palette slot — mirror how dominant each color is in the artwork. */
export const PALETTE_WEIGHTS: ReadonlyArray<{ key: keyof Palette; weight: number }> = [
  { key: 'bg1', weight: 0.3 },
  { key: 'bg2', weight: 0.25 },
  { key: 'blob1', weight: 0.2 },
  { key: 'blob2', weight: 0.14 },
  { key: 'accent', weight: 0.11 },
]

export interface Rgb {
  r: number
  g: number
  b: number
}

/** Parse "#RGB" or "#RRGGBB" into RGB channels. Falls back to black on invalid input. */
export function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 0, g: 0, b: 0 }
  const num = parseInt(h, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

/** Convert RGB channels (0-255) to an uppercase "#RRGGBB" string. */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase()
}

/** Perceived luminance (Rec. 709 luma), 0-255. */
export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** HSV-style saturation: (max - min) / max, 0 if the color is pure black. */
export function saturation({ r, g, b }: Rgb): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0) return 0
  return (max - min) / max
}

/** Normalized euclidean RGB distance between two hex colors, 0 (identical) .. 1. */
export function colorDistance(hexA: string, hexB: string): number {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  const dist = Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
  return dist / Math.sqrt(3 * 255 * 255)
}

/** Cosine similarity between two vectors; zero vectors safely yield 0. */
export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / Math.sqrt(normA * normB)
}

/** Weighted stats over the 5 palette colors (used by the compliance engine). */
export function paletteStats(p: Palette): { meanLuminance: number; meanSaturation: number } {
  let lum = 0
  let sat = 0
  for (const { key, weight } of PALETTE_WEIGHTS) {
    const rgb = hexToRgb(p[key])
    lum += weight * luminance(rgb)
    sat += weight * saturation(rgb)
  }
  return { meanLuminance: lum, meanSaturation: sat }
}

/** Convert a product palette into the shared 64-dim embedding space. */
export function paletteToEmbedding(p: Palette): number[] {
  const vec = new Array<number>(EMBEDDING_DIM).fill(0)
  const colors = PALETTE_WEIGHTS.map(({ key, weight }) => ({ rgb: hexToRgb(p[key]), weight }))

  // Dims 0-47: per-channel 16-bin histograms, each channel normalized to sum exactly 1/3.
  const channels: Array<keyof Rgb> = ['r', 'g', 'b']
  channels.forEach((channel, channelIndex) => {
    const bins = new Array<number>(16).fill(0)
    for (const { rgb, weight } of colors) {
      const value = rgb[channel]
      bins[Math.floor(value / 16)] += weight
    }
    const sum = bins.reduce((s, v) => s + v, 0)
    if (sum > 0) {
      const scale = 1 / 3 / sum
      for (let i = 0; i < 16; i++) vec[channelIndex * 16 + i] = bins[i] * scale
    }
  })

  // Dims 48-63: uniform 4x4 grid of the weighted mean luminance (each cell = meanLum / 255 / 16).
  const { meanLuminance } = paletteStats(p)
  const cell = meanLuminance / 255 / 16
  for (let i = 48; i < 64; i++) vec[i] = cell

  return vec
}

/**
 * Convert raw RGBA pixel data (e.g. from a canvas downsample on the client) into
 * the same 64-dim space. Pixels with alpha < 32 are skipped. The 4x4 grid is
 * spatial: the image is divided into 16 tiles and each tile stores its mean
 * luminance / 255, normalized so the 16 cells sum to 1.
 */
export function imageDataToEmbedding(pixels: Uint8ClampedArray, width: number, height: number): number[] {
  const vec = new Array<number>(EMBEDDING_DIM).fill(0)
  if (width <= 0 || height <= 0 || pixels.length < width * height * 4) return vec

  const channelBins: Record<keyof Rgb, number[]> = {
    r: new Array<number>(16).fill(0),
    g: new Array<number>(16).fill(0),
    b: new Array<number>(16).fill(0),
  }
  const cellLumSum = new Array<number>(16).fill(0)
  const cellCount = new Array<number>(16).fill(0)
  let counted = 0

  for (let y = 0; y < height; y++) {
    const gy = Math.min(3, Math.floor((y / height) * 4))
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (pixels[i + 3] < 32) continue
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      channelBins.r[Math.floor(r / 16)] += 1
      channelBins.g[Math.floor(g / 16)] += 1
      channelBins.b[Math.floor(b / 16)] += 1
      const gx = Math.min(3, Math.floor((x / width) * 4))
      const cell = gy * 4 + gx
      cellLumSum[cell] += luminance({ r, g, b })
      cellCount[cell] += 1
      counted++
    }
  }

  if (counted === 0) return vec

  // Dims 0-47: per-channel histograms, each normalized to sum exactly 1/3.
  const channels: Array<keyof Rgb> = ['r', 'g', 'b']
  channels.forEach((channel, channelIndex) => {
    const bins = channelBins[channel]
    const sum = bins.reduce((s, v) => s + v, 0)
    if (sum > 0) {
      const scale = 1 / 3 / sum
      for (let i = 0; i < 16; i++) vec[channelIndex * 16 + i] = bins[i] * scale
    }
  })

  // Dims 48-63: spatial luminance grid, normalized so the 16 cells sum to 1.
  const cellMeans = cellLumSum.map((sum, i) => (cellCount[i] > 0 ? sum / cellCount[i] / 255 : 0))
  const total = cellMeans.reduce((s, v) => s + v, 0)
  for (let i = 0; i < 16; i++) {
    vec[48 + i] = total > 0 ? cellMeans[i] / total : 1 / 16
  }

  return vec
}

/** Color word -> representative hex. English keys are lowercase; Arabic keys are exact strings. */
export const COLOR_WORDS: Record<string, string> = {
  // English
  red: '#EF4444',
  crimson: '#DC2626',
  scarlet: '#E11D48',
  orange: '#F97316',
  amber: '#F59E0B',
  yellow: '#EAB308',
  gold: '#D4AF37',
  lime: '#84CC16',
  green: '#22C55E',
  emerald: '#10B981',
  teal: '#14B8A6',
  turquoise: '#14B8A6',
  cyan: '#06B6D4',
  sky: '#38BDF8',
  blue: '#3B82F6',
  navy: '#1E3A8A',
  azure: '#38BDF8',
  indigo: '#6366F1',
  violet: '#8B5CF6',
  purple: '#A855F7',
  magenta: '#D946EF',
  pink: '#F472B6',
  rose: '#F43F5E',
  brown: '#92400E',
  tan: '#C0956C',
  beige: '#E3D5C0',
  cream: '#F5EBDC',
  maroon: '#7F1D1D',
  olive: '#808000',
  black: '#1F1F1F',
  white: '#FAFAFA',
  silver: '#C0C0C0',
  gray: '#9CA3AF',
  grey: '#9CA3AF',
  charcoal: '#364153',
  // Arabic (exact strings)
  'أحمر': '#EF4444',
  'حمراء': '#EF4444',
  'أحمر داكن': '#7F1D1D',
  'أزرق': '#3B82F6',
  'زرقاء': '#3B82F6',
  'كحلي': '#1E3A8A',
  'أخضر': '#22C55E',
  'خضراء': '#22C55E',
  'أسود': '#1F1F1F',
  'سوداء': '#1F1F1F',
  'أبيض': '#FAFAFA',
  'بيضاء': '#FAFAFA',
  'ذهبي': '#D4AF37',
  'ذهبية': '#D4AF37',
  'فضي': '#C0C0C0',
  'فضية': '#C0C0C0',
  'رمادي': '#9CA3AF',
  'بني': '#92400E',
  'وردي': '#F472B6',
  'بنفسجي': '#8B5CF6',
  'تركوازي': '#14B8A6',
  'بيج': '#E3D5C0',
  'عاجي': '#F5EBDC',
  'برتقالي': '#F97316',
  'برتقالية': '#F97316',
  'أصفر': '#EAB308',
  'صفراء': '#EAB308',
  'عنابي': '#7F1D1D',
  'زيتي': '#808000',
  'نبيتي': '#7F1D1D',
}

const ARABIC_SCRIPT = /[\u0600-\u06FF]/

/**
 * Find every color word mentioned in a piece of text (case-insensitive substring
 * match; Arabic words are matched directly). Used to check whether listing copy
 * matches the palette of the generated product image.
 */
export function extractColorWords(text: string): { word: string; hex: string }[] {
  const matches: { word: string; hex: string }[] = []
  const seen = new Set<string>()
  const lower = text.toLowerCase()
  for (const [word, hex] of Object.entries(COLOR_WORDS)) {
    if (seen.has(word)) continue
    const isArabic = ARABIC_SCRIPT.test(word)
    const found = isArabic ? text.includes(word) : lower.includes(word)
    if (found) {
      matches.push({ word, hex })
      seen.add(word)
    }
  }
  return matches
}

/** The two dominant colors of a palette (the artwork background layers). */
export function dominantColors(p: Palette): string[] {
  return [p.bg1, p.bg2]
}
