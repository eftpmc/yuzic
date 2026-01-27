import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { ExternalArtistBase } from '@/types'
import { selectSimilarArtists } from '@/utils/redux/selectors/exploreSelectors'
import { shuffle } from '../utils/snapshot'

const ARTIST_TARGET = 12

export function useExploreArtists(refreshKey: number) {
  const similarArtists = useSelector(selectSimilarArtists)

  const data: ExternalArtistBase[] = useMemo(() => {
    return shuffle(similarArtists.map(e => e.artist))
      .slice(0, ARTIST_TARGET)
  }, [similarArtists, refreshKey])

  return {
    data,
    ready: data.length >= ARTIST_TARGET,
  }
}