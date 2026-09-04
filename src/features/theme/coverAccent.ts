
/**
 * What `react-native-image-colors` returns, narrowed to the fields used here.
 *
 * Its own types live at a deep path inside the package that is not part of its
 * public entry point, so depending on them would break on any reshuffle of its
 * build output.
 */
export type ExtractedColors = {
  platform: string
  dominant?: string
  darkVibrant?: string
  primary?: string
  background?: string
}

/**
 * The one colour worth taking from a piece of cover art.
 *
 * `react-native-image-colors` returns a different shape per platform — Android
 * gives a palette to choose from, iOS gives positional colours — so the choice
 * lives here rather than at each call site, and can be checked without a device.
 */
export function pickAccent(result: ExtractedColors, fallback: string): string {
  if (result.platform === 'android') {
    return result.darkVibrant || result.dominant || fallback
  }
  if (result.platform === 'ios') {
    return result.primary || result.background || fallback
  }
  return fallback
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
