import { useMemo } from 'react'
import { ExternalArtistBase } from '@/types'
import { EXPLORE_LIMITS } from '../exploreLimits'
import { shuffle } from '../utils/snapshot'
import { useExploreArtistsEntries } from './useExploreArtistsEntries'

export function useExploreArtists(shuffleKey: number) {
  const similar = useExploreArtistsEntries()

  const [data, allData] = useMemo(() => {
    const shuffled = shuffle(similar.map((e) => e.artist))
    return [
      shuffled.slice(0, EXPLORE_LIMITS.displayPerSection),
      shuffled,
    ] as const
  }, [similar, shuffleKey])

  return {
    data,
    allData,
    ready: data.length >= EXPLORE_LIMITS.displayPerSection,
  }
}
