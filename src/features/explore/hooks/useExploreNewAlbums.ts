import { useMemo } from 'react'
import { ExternalAlbumBase } from '@/types'
import { EXPLORE_LIMITS } from '../exploreLimits'
import { buildNewAlbumSnapshot } from '../utils/snapshot'
import { useExploreArtistsEntries } from './useExploreArtistsEntries'

const ALL_CAP = 9999

export function useExploreNewAlbums(shuffleKey: number) {
  const similar = useExploreArtistsEntries()

  const [data, allData] = useMemo(() => {
    const displayed = buildNewAlbumSnapshot(
      similar,
      EXPLORE_LIMITS.displayPerSection
    )
    const all = buildNewAlbumSnapshot(similar, ALL_CAP)
    return [displayed, all] as const
  }, [similar, shuffleKey])

  return {
    data,
    allData,
    ready: data.length >= EXPLORE_LIMITS.displayPerSection,
  }
}
