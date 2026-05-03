import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useArtists } from '@/hooks/artists'
import * as listenbrainz from '@/api/listenbrainz'
import * as musicbrainz from '@/api/musicbrainz'
import { getArtistBasic, fetchArtistImage } from '@/api/musicbrainz/artists/getArtist'
import { resolveArtistMbid } from '@/utils/musicbrainz/resolveArtistMbid'
import { sharedMusicBrainzQueue } from '../utils/requestQueue'
import { QueryKeys } from '@/enums/queryKeys'
import type { ExternalArtistBase, ExternalAlbumBase } from '@/types'

const POOL_SIZE = 16
const TARGET_ARTISTS = 8
const PICK_ALBUM_ARTISTS = 6
const TARGET_ALBUMS = 8
const MAX_ALBUMS_PER_ARTIST = 2

const LB_DELAY_MS = 500

type SimilarContentResult = {
  artists: ExternalArtistBase[]
  albums: ExternalAlbumBase[]
}

type Candidate = {
  mbid: string
  name: string
  area?: string
  imagePromise: Promise<string | null>
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchSimilarContent(
  seeds: { id?: string; name: string; mbid?: string | null }[]
): Promise<SimilarContentResult> {
  const seen = new Set<string>()
  const candidates: Candidate[] = []

  for (const seed of shuffle(seeds)) {
    if (candidates.length >= POOL_SIZE) break
    if (seed.name.toLowerCase() === 'various artists') continue

    const seedMbid = seed.mbid ?? await sharedMusicBrainzQueue.run(() =>
      resolveArtistMbid(seed.id, seed.name)
    )
    if (!seedMbid) continue

    await delay(LB_DELAY_MS)
    const similar = await listenbrainz.getSimilarArtists(seedMbid, {
      limit: Math.max(POOL_SIZE * 3, 48),
    })

    const similarMbids = shuffle(
      similar.map(s => s.artist_mbid).filter(m => !seen.has(m))
    )

    for (const similarMbid of similarMbids) {
      if (candidates.length >= POOL_SIZE) break
      if (seen.has(similarMbid)) continue
      seen.add(similarMbid)

      const basic = await sharedMusicBrainzQueue.run(() => getArtistBasic(similarMbid))
      if (!basic) continue

      const imagePromise = basic.wikidataId
        ? fetchArtistImage(basic.wikidataId)
        : Promise.resolve(null)

      candidates.push({
        mbid: basic.id,
        name: basic.name,
        area: basic.area,
        imagePromise,
      })
    }
  }

  const displayCandidates = candidates.slice(0, TARGET_ARTISTS)
  const albumCandidates = candidates.slice(TARGET_ARTISTS, TARGET_ARTISTS + PICK_ALBUM_ARTISTS)

  const [artists, albums] = await Promise.all([
    Promise.all(
      displayCandidates.map(async c => {
        const imageUrl = await c.imagePromise
        return {
          id: c.mbid,
          name: c.name,
          subtext: c.area ?? '',
          cover: imageUrl
            ? { kind: 'url' as const, url: imageUrl }
            : { kind: 'none' as const },
        } as ExternalArtistBase
      })
    ),

    (async (): Promise<ExternalAlbumBase[]> => {
      const seenAlbums = new Set<string>()
      const result: ExternalAlbumBase[] = []
      for (const artist of albumCandidates) {
        if (result.length >= TARGET_ALBUMS) break
        const artistAlbums = await sharedMusicBrainzQueue.run(() =>
          musicbrainz.getArtistAlbums(artist.mbid, artist.name, MAX_ALBUMS_PER_ARTIST + 2)
        )
        let taken = 0
        for (const a of artistAlbums) {
          if (taken >= MAX_ALBUMS_PER_ARTIST || result.length >= TARGET_ALBUMS) break
          if (!seenAlbums.has(a.id)) {
            seenAlbums.add(a.id)
            result.push(a)
            taken++
          }
        }
      }
      return shuffle(result).slice(0, TARGET_ALBUMS)
    })(),
  ])

  return { artists, albums }
}

export function useSimilarContent() {
  const { artists } = useArtists()
  const queryClient = useQueryClient()

  const seeds = useMemo(() => artists
    .slice(0, 5)
    .map(a => ({ id: a.id, name: a.name, mbid: a.mbid }))
    .filter(a => a.name.trim()), [artists])

  const queryKey = useMemo(
    () => [QueryKeys.ExploreSimilarContent, seeds.map(s => s.name).join(',')],
    [seeds]
  )

  const query = useQuery({
    queryKey,
    queryFn: () => fetchSimilarContent(seeds),
    enabled: seeds.length > 0,
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'online',
  })

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  return {
    artists: (query.data?.artists ?? []).slice(0, TARGET_ARTISTS),
    albums: (query.data?.albums ?? []).slice(0, TARGET_ALBUMS),
    artistsReady: !query.isLoading && (query.data?.artists?.length ?? 0) > 0,
    albumsReady: !query.isLoading && (query.data?.albums?.length ?? 0) > 0,
    isFetching: query.isFetching,
    isError: query.isError,
    hasNoSeeds: seeds.length === 0,
    refresh,
  }
}
