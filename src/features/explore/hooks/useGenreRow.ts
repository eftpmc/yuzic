import { useQuery } from '@tanstack/react-query'
import * as musicbrainz from '@/api/musicbrainz'
import { sharedMusicBrainzQueue } from '../utils/requestQueue'
import { QueryKeys } from '@/enums/queryKeys'
import { seededShuffle } from './useDailyLayout'
import type { ExternalAlbumBase } from '@/types'

const MIN_ALBUMS = 8
const TARGET_ALBUMS = 10

async function fetchGenreRow(seed: number): Promise<{
  genre: string
  albums: ExternalAlbumBase[]
}> {
  const tags = await sharedMusicBrainzQueue.run(() => musicbrainz.getTags())
  if (tags.length === 0) return { genre: '', albums: [] }

  const picked = seededShuffle(tags, seed)[0]!
  const albums = await sharedMusicBrainzQueue.run(() =>
    musicbrainz.getReleaseGroupsByTag(picked, TARGET_ALBUMS)
  )

  return { genre: picked, albums }
}

export function useGenreRow(shuffleKey: number) {
  const query = useQuery({
    queryKey: [QueryKeys.ExploreGenreRow, shuffleKey],
    queryFn: () => fetchGenreRow(shuffleKey),
    staleTime: 1000 * 60 * 5,
  })

  const { genre, albums } = query.data ?? { genre: '', albums: [] }

  return {
    genre,
    data: albums.slice(0, TARGET_ALBUMS),
    ready: !query.isLoading && albums.length >= MIN_ALBUMS,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}
