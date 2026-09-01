
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
