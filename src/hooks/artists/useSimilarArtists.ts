import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import * as listenbrainz from '@/api/listenbrainz'
import { fetchArtistImage, getArtistBasic } from '@/api/musicbrainz/artists/getArtist'
import { QueryKeys } from '@/enums/queryKeys'
import { staleTime } from '@/constants/staleTime'
import type { ExternalArtistBase } from '@/types'
import { resolveArtistMbid } from '@/utils/musicbrainz/resolveArtistMbid'
import { sharedMusicBrainzQueue } from '@/features/explore/utils/requestQueue'

export type SimilarArtistsInput = {
  mbid?: string | null
  name?: string | null
  excludeName?: string | null
  limit?: number
}

export async function getSimilarExternalArtists({
  mbid,
  name,
  excludeName,
  limit = 8,
}: SimilarArtistsInput): Promise<ExternalArtistBase[]> {
  const resolvedMbid =
    mbid ?? (name ? await sharedMusicBrainzQueue.run(() => resolveArtistMbid(undefined, name)) : null)

  if (!resolvedMbid) return []

  const similar = await listenbrainz.getSimilarArtists(resolvedMbid, {
    limit: Math.max(limit * 2, 16),
  })

  const normalizedExcludeName = excludeName?.trim().toLowerCase()
  const result: ExternalArtistBase[] = []
  const seen = new Set<string>([resolvedMbid])

  for (const candidate of similar) {
    if (result.length >= limit) break
    if (seen.has(candidate.artist_mbid)) continue
    seen.add(candidate.artist_mbid)

    const basic = await sharedMusicBrainzQueue.run(() => getArtistBasic(candidate.artist_mbid))
    if (!basic) continue
    if (normalizedExcludeName && basic.name.trim().toLowerCase() === normalizedExcludeName) continue

    const imageUrl = basic.wikidataId
      ? await fetchArtistImage(basic.wikidataId)
      : null

    result.push({
      id: basic.id,
      name: basic.name,
      subtext: basic.area ?? '',
      cover: imageUrl ? { kind: 'url', url: imageUrl } : { kind: 'none' },
    })
  }

  return result
}

export function useSimilarArtists(input: SimilarArtistsInput) {
  const queryKey = useMemo(
    () => [QueryKeys.ExploreSimilarArtists, input.mbid ?? input.name ?? '', input.limit ?? 8],
    [input.limit, input.mbid, input.name]
  )

  return useQuery({
    queryKey,
    queryFn: () => getSimilarExternalArtists(input),
    enabled: Boolean(input.mbid || input.name),
    staleTime: staleTime.musicbrainz,
    networkMode: 'online',
  })
}
