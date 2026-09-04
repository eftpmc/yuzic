import { useEffect, useState } from 'react'
import ImageColors from 'react-native-image-colors'

import { buildCover } from '@/utils/builders/buildCover'
import { PLAYING_GRADIENT_CACHE_MAX } from '@/constants/features'
import type { CoverSource } from '@/types'
import { createAccentCache, darken, pickAccent } from './coverAccent'

const accents = createAccentCache<string>(PLAYING_GRADIENT_CACHE_MAX)

/**
 * A darkened accent taken from a cover, or null until there is one.
 *
 * Null rather than a default colour so a screen can render its ordinary
 * background and fade the accent in once it arrives, instead of flashing a grey
 * band on the way to the real one.
 */
export function useCoverAccent(cover: CoverSource | undefined): string | null {
  const [accent, setAccent] = useState<string | null>(null)

  useEffect(() => {
    if (!cover) {
      setAccent(null)
      return
    }
    const uri = buildCover(cover, 'detail')
    if (!uri) {
      setAccent(null)
      return
    }

    const cached = accents.get(uri)
    if (cached) {
      setAccent(cached)
      return
    }

    // The cover can change before extraction finishes — a fast scroll through
    // pushed screens — and the late result must not paint over the new one.
    let current = true
    setAccent(null)
    ImageColors.getColors(uri, { fallback: '#121212' })
      .then(result => {
        const value = darken(pickAccent(result, '#121212'))
        accents.set(uri, value)
        if (current) setAccent(value)
      })
      .catch(() => {
        if (current) setAccent(null)
      })

    return () => {
      current = false
    }
  }, [cover])

  return accent
}
