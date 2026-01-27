import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { ExternalAlbumBase } from '@/types'
import { selectSimilarArtists } from '@/utils/redux/selectors/exploreSelectors'
import { buildNewAlbumSnapshot } from '../utils/snapshot'

const ALBUM_TARGET = 12

export function useExploreNewAlbums(refreshKey: number) {
  const similarArtists = useSelector(selectSimilarArtists)

  const data: ExternalAlbumBase[] = useMemo(() => {
    return buildNewAlbumSnapshot(
      similarArtists,
      ALBUM_TARGET
    )
  }, [similarArtists, refreshKey])

  return {
    data,
    ready: data.length >= ALBUM_TARGET,
  }
}