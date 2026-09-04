import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getLastFmSimilarArtists } from '@/api/lastfm/getSimilarArtists'
import { LASTFM_API_KEY } from '@/constants/keys'
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
  name: string,
  excludeName: string | undefined,
  limit: number
): Promise<ExternalArtistBase[]> {
  const candidates = await getLastFmSimilarArtists(LASTFM_API_KEY, name, limit * 3)
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
  const queryKey = useMemo(
    () => [QueryKeys.ExploreSimilarArtists, input.mbid ?? input.name ?? '', input.limit ?? 8],
    [input.limit, input.mbid, input.name]
  )

  return useQuery({
    queryKey,
    queryFn: () => fetchLastFmSimilarArtists(input.name!, input.excludeName ?? undefined, input.limit ?? 8),
    // Backed by the bundled Last.fm api_key; if the build doesn't have one,
    // this returns nothing rather than firing a doomed request.
    enabled: (input.enabled ?? true) && Boolean(input.name) && Boolean(LASTFM_API_KEY),
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'online',
  })
}
