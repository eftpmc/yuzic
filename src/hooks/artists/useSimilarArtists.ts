import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import * as deezer from '@/api/deezer'
import * as listenbrainz from '@/api/listenbrainz'
import { fetchArtistCommonsFilename, getArtistBasic } from '@/api/musicbrainz/artists/getArtist'
import { getArtistImagesByMbid } from '@/api/musicbrainz/artists/getArtistImagesByMbid'
import { getLastFmSimilarArtists } from '@/api/rawarr/lastfm/getSimilarArtists'
import { RAWARR_URL } from '@/constants/rawarr'
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

async function getSimilarViaLastFm(
  name: string,
  excludeName: string | undefined,
  limit: number
): Promise<ExternalArtistBase[]> {
  const candidates = await getLastFmSimilarArtists(RAWARR_URL, name, limit * 2)
  if (!candidates.length) return []

  const normalizedExclude = excludeName?.trim().toLowerCase()
  const filtered = candidates.filter(
    c => !!c.mbid && (!normalizedExclude || c.name.trim().toLowerCase() !== normalizedExclude)
  ).slice(0, limit)

  const deezerArtists = (await Promise.all(
    filtered.map(c => deezer.resolveDeezerArtistByName(c.name))
  )).filter(Boolean) as ExternalArtistBase[]

  if (deezerArtists.length > 0) {
    return deezerArtists.slice(0, limit)
  }

  // Fallback to Wikidata images by MBID when Deezer cannot resolve the list.
  const mbids = filtered.map(c => c.mbid) as string[]
  const images = mbids.length ? await getArtistImagesByMbid(mbids) : new Map<string, string>()

  return filtered.map(c => {
    const commonsFilename = images.get(c.mbid!)
    return {
      id: c.mbid!,
      name: c.name,
      subtext: '',
      cover: commonsFilename
        ? { kind: 'commons' as const, filename: commonsFilename }
        : { kind: 'none' as const },
    }
  })
}

export async function getSimilarExternalArtists({
  mbid,
  name,
  excludeName,
  limit = 8,
}: SimilarArtistsInput): Promise<ExternalArtistBase[]> {
  // Fast path: use LastFM via rawarr-server (no MusicBrainz queue needed for the list itself)
  if (name) {
    const lastFmResult = await getSimilarViaLastFm(name, excludeName ?? undefined, limit)
    if (lastFmResult.length > 0) return lastFmResult
  }

  // Fallback: ListenBrainz + MusicBrainz
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

    const filename = basic.wikidataId
      ? await fetchArtistCommonsFilename(basic.wikidataId)
      : null

    result.push({
      id: basic.id,
      name: basic.name,
      subtext: basic.area ?? '',
      cover: filename ? { kind: 'commons', filename } : { kind: 'none' },
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
