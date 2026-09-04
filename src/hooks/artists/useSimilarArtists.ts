import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'

import { getLastFmSimilarArtists } from '@/api/lastfm/getSimilarArtists'
import { selectLastFmApiKey } from '@/utils/redux/selectors/lastfmSelectors'
import { QueryKeys } from '@/enums/queryKeys'
import type { ExternalArtistBase } from '@/types'

export type SimilarArtistsInput = {
  mbid?: string | null
  name?: string | null
  excludeName?: string | null
  limit?: number
  enabled?: boolean
}

async function fetchLastFmSimilarArtists(
  apiKey: string,
  name: string,
  excludeName: string | undefined,
  limit: number
): Promise<ExternalArtistBase[]> {
  const candidates = await getLastFmSimilarArtists(apiKey, name, limit * 3)
  if (!candidates.length) return []

  const normalizedExclude = excludeName?.trim().toLowerCase()
  const seen = new Set<string>()

  return candidates
    .filter(c => {
      const key = c.name.trim().toLowerCase()
      if (!key || seen.has(key)) return false
      if (normalizedExclude && key === normalizedExclude) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
    .map(c => ({
      id: c.mbid ?? c.name,
      name: c.name,
      cover: { kind: 'letter' as const, name: c.name },
      subtext: '',
      externalIds: c.mbid ? { mbid: c.mbid } : undefined,
    }))
}

export function useSimilarArtists(input: SimilarArtistsInput) {
  const apiKey = useSelector(selectLastFmApiKey)

  const queryKey = useMemo(
    () => [QueryKeys.ExploreSimilarArtists, input.mbid ?? input.name ?? '', input.limit ?? 8],
    [input.limit, input.mbid, input.name]
  )

  return useQuery({
    queryKey,
    queryFn: () => fetchLastFmSimilarArtists(apiKey, input.name!, input.excludeName ?? undefined, input.limit ?? 8),
    // Requires the user's own Last.fm api_key; if they haven't entered one,
    // this hook stays quiet (returns nothing) instead of calling out to a
    // proxy on their behalf.
    enabled: (input.enabled ?? true) && Boolean(input.name) && Boolean(apiKey),
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'online',
  })
}
