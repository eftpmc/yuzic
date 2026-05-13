import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import * as deezer from '@/api/deezer'
import { getLastFmSimilarArtists } from '@/api/rawarr/lastfm/getSimilarArtists'
import { RAWARR_URL } from '@/constants/rawarr'
import { QueryKeys } from '@/enums/queryKeys'
import type { ExternalArtistBase } from '@/types'

export type SimilarArtistsInput = {
  mbid?: string | null
  name?: string | null
  excludeName?: string | null
  limit?: number
}

async function getSimilarViaLastFm(
  name: string,
  excludeName: string | undefined,
  limit: number
): Promise<ExternalArtistBase[]> {
  const candidates = await getLastFmSimilarArtists(RAWARR_URL, name, limit * 3)
  if (!candidates.length) return []

  const normalizedExclude = excludeName?.trim().toLowerCase()
  const seenNames = new Set<string>()
  const filtered = candidates.filter(candidate => {
    const key = candidate.name.trim().toLowerCase()
    if (!key || seenNames.has(key)) return false
    if (normalizedExclude && key === normalizedExclude) return false
    seenNames.add(key)
    return true
  }).slice(0, limit * 2)

  const deezerArtists = (await Promise.all(
    filtered.map(c => deezer.resolveDeezerArtistByName(c.name))
  )).filter(Boolean) as ExternalArtistBase[]

  const seenArtistIds = new Set<string>()
  return deezerArtists.filter(artist => {
    if (seenArtistIds.has(artist.id)) return false
    seenArtistIds.add(artist.id)
    return true
  }).slice(0, limit)
}

export async function getSimilarExternalArtists({
  name,
  excludeName,
  limit = 8,
}: SimilarArtistsInput): Promise<ExternalArtistBase[]> {
  if (!name) return []
  return getSimilarViaLastFm(name, excludeName ?? undefined, limit)
}

export function useSimilarArtists(input: SimilarArtistsInput) {
  const queryKey = useMemo(
    () => [QueryKeys.ExploreSimilarArtists, input.mbid ?? input.name ?? '', input.limit ?? 8],
    [input.limit, input.mbid, input.name]
  )

  return useQuery({
    queryKey,
    queryFn: () => getSimilarExternalArtists(input),
    enabled: Boolean(input.name),
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'online',
  })
}
