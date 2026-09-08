
/**
 * What `react-native-image-colors` returns, narrowed to the fields used here.
 *
 * Its own types live at a deep path inside the package that is not part of its
 * public entry point, so depending on them would break on any reshuffle of its
 * build output.
 */
export type ExtractedColors = {
  platform: string
  // Android: a palette, named by what each swatch is.
  dominant?: string
  average?: string
  vibrant?: string
  darkVibrant?: string
  lightVibrant?: string
  muted?: string
  darkMuted?: string
  lightMuted?: string
  // iOS: positional colours, named by where on the image they were found.
  background?: string
  primary?: string
  secondary?: string
  detail?: string
}

type Rgb = { r: number; g: number; b: number }
type Hsl = { h: number; s: number; l: number }

function parseHex(hex: string): Rgb | null {
  let col = hex.replace('#', '')
  if (col.length === 3) col = col.split('').map(c => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(col)) return null
  const num = parseInt(col, 16)
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff }
}

function toHex({ r, g, b }: Rgb): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b))
    .toString(16)
    .slice(1)}`
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, l }
  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = ((gn - bn) / delta) % 6
  else if (max === gn) h = (bn - rn) / delta + 2
  else h = (rn - gn) / delta + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s, l }
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] :
    [c, 0, x]
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 }
}

/**
 * How much colour a swatch actually carries, from 0 to 1.
 *
 * Saturation alone is not it: a near-black and a near-white can both report a
 * high saturation off a handful of units of difference, and both look grey on
 * screen. Weighting saturation by how far the swatch is from either end of the
 * lightness range scores the colours a person would call colourful — which is
 * the question actually being asked of a cover.
 */
export function vividness(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 0
  const { s, l } = rgbToHsl(rgb)
  // Peaks at l = 0.5 and reaches 0 at pure black and pure white.
  const room = 1 - Math.abs(2 * l - 1)
  return s * room
}

/**
 * The one colour worth taking from a piece of cover art.
 *
 * `react-native-image-colors` returns a different shape per platform — Android
 * gives a palette to choose from, iOS gives positional colours — so the choice
 * lives here rather than at each call site, and can be checked without a device.
 *
 * Taking the first swatch a platform offers is what landed so many covers on a
 * brown or a grey: `primary` on iOS is the most *common* colour in the image,
 * and the most common colour in a photograph is usually mud. The candidates are
 * scored on `vividness` instead and the most colourful one wins, with the
 * platform's own order breaking ties — so a cover that really is monochrome
 * still gets its own grey rather than a hue invented for it.
 */
export function pickAccent(result: ExtractedColors, fallback: string): string {
  const candidates = (
    result.platform === 'android'
      ? [
          result.vibrant,
          result.darkVibrant,
          result.lightVibrant,
          result.dominant,
          result.muted,
          result.darkMuted,
          result.average,
        ]
      : result.platform === 'ios'
        ? [result.primary, result.secondary, result.detail, result.background]
        : []
  ).filter((c): c is string => typeof c === 'string' && c.length > 0)

  if (!candidates.length) return fallback

  let best = candidates[0]
  let bestScore = vividness(best)
  for (const candidate of candidates.slice(1)) {
    const score = vividness(candidate)
    // Strictly greater, so a tie keeps the platform's own preferred swatch.
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }
  return best
}

/** Below this, a swatch is grey enough that pushing colour into it would be
 *  inventing one. Above it the hue is real, only under-saturated. */
const HUE_FLOOR = 0.06

/** Where a wash has to land: dark enough for white text over it, saturated
 *  enough to read as the record's colour rather than as a dimmed screen. */
const WASH_SATURATION_FLOOR = 0.45
const WASH_LIGHTNESS_MIN = 0.16
const WASH_LIGHTNESS_MAX = 0.32

/**
 * A cover's accent, made fit to sit behind a screen of text.
 *
 * Darkening alone — which is all this used to do — drags a swatch towards black
 * and its saturation down with it, so a cover's one good colour arrived as
 * sludge. This keeps the hue, lifts the saturation to a floor when the swatch
 * had a hue to begin with, and moves only the lightness into the band where
 * white text stays readable. A genuinely achromatic swatch is just darkened,
 * because a grey cover with a purple wash is a lie about the record.
 */
export function toWashAccent(hex: string): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const { h, s, l } = rgbToHsl(rgb)
  if (s < HUE_FLOOR) return darken(hex)
  return toHex(
    hslToRgb({
      h,
      s: Math.max(s, WASH_SATURATION_FLOOR),
      l: Math.max(WASH_LIGHTNESS_MIN, Math.min(WASH_LIGHTNESS_MAX, l)),
    })
  )
}

/**
 * A colour moved towards black.
 *
 * Cover art is chosen to look good at full saturation on its own; behind text
 * it has to stay a background, so the accent is darkened before it is used as
 * one and the top of the gradient never competes with the title over it.
 */
export function darken(hex: string, amount = 0.3): string {
  let col = hex.replace('#', '')
  if (col.length === 3) col = col.split('').map(c => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(col)) return hex

  const num = parseInt(col, 16)
  const scale = (channel: number) =>
    Math.max(0, Math.min(255, Math.floor(channel * (1 - amount))))
  const r = scale((num >> 16) & 0xff)
  const g = scale((num >> 8) & 0xff)
  const b = scale(num & 0xff)

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * A least-recently-added cache of extracted colours.
 *
 * Extraction decodes the image, so a list scrolled back and forth would pay for
 * the same cover repeatedly. Bounded because a large library would otherwise
 * hold every cover it has ever shown.
 */
export function createAccentCache<T>(max: number) {
  const entries = new Map<string, T>()
  return {
    get: (key: string) => entries.get(key),
    set(key: string, value: T) {
      if (entries.size >= max) {
        const oldest = entries.keys().next()
        if (!oldest.done) entries.delete(oldest.value)
      }
      entries.set(key, value)
    },
    get size() {
      return entries.size
    },
  }
}

/**
 * The same colour at a given opacity, as `rgba()`.
 *
 * A gradient written as `[accent, 'transparent']` does not fade the accent out
 * — `transparent` is transparent *black*, so every stop between the two is
 * partly black and the wash reads as a grey bruise on its way to nothing,
 * which is worse the lighter the accent and the lighter the background under
 * it. Fading to the accent's own zero-alpha keeps the hue constant and only
 * the opacity moves.
 */
export function withAlpha(hex: string, alpha: number): string {
  let col = hex.replace('#', '')
  if (col.length === 3) col = col.split('').map(c => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(col)) return hex

  const num = parseInt(col, 16)
  const clamped = Math.max(0, Math.min(1, alpha))
  return `rgba(${(num >> 16) & 0xff}, ${(num >> 8) & 0xff}, ${num & 0xff}, ${clamped})`
}

/**
 * The stops of the wash behind a detail header, softest-possible.
 *
 * Two stops ramp the alpha linearly, and a linear ramp against a flat
 * background is exactly the case the eye picks out as a band. These ease the
 * alpha out instead: full for the first quarter, where the cover sits, then
 * away faster than the distance to the end.
 */
export const ACCENT_WASH_ALPHAS = [1, 0.92, 0.68, 0.38, 0.16, 0.04, 0] as const
export const ACCENT_WASH_LOCATIONS = [0, 0.22, 0.42, 0.6, 0.76, 0.9, 1] as const

export function accentWashColors(
  accent: string
): readonly [string, string, ...string[]] {
  const [first, second, ...rest] = ACCENT_WASH_ALPHAS.map(alpha =>
    withAlpha(accent, alpha)
  )
  return [first, second, ...rest]
}
