import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useArtists } from '@/hooks/artists'
import * as deezer from '@/api/deezer'
import * as listenbrainz from '@/api/listenbrainz'
import * as musicbrainz from '@/api/musicbrainz'
import { getArtistBasic, fetchArtistCommonsFilename } from '@/api/musicbrainz/artists/getArtist'
import { getLastFmSimilarArtists } from '@/api/rawarr/lastfm/getSimilarArtists'
import { RAWARR_URL } from '@/constants/rawarr'
import { resolveArtistMbid } from '@/utils/musicbrainz/resolveArtistMbid'
import { sharedMusicBrainzQueue } from '../utils/requestQueue'
import { QueryKeys } from '@/enums/queryKeys'
import { selectArtistPlayCounts } from '@/utils/redux/selectors/statsSelectors'
import type { CoverSource, ExternalArtistBase, ExternalAlbumBase } from '@/types'

const POOL_SIZE = 16
const TARGET_ARTISTS = 8
const PICK_ALBUM_ARTISTS = 6
const TARGET_ALBUMS = 8
const MAX_ALBUMS_PER_ARTIST = 2
const SEED_COUNT = 5
const SEED_POOL_SIZE = 20

const LB_DELAY_MS = 500
const SIMILAR_CONTENT_TIMEOUT_MS = 15000

type SimilarContentResult = {
  artists: ExternalArtistBase[]
  albums: ExternalAlbumBase[]
}

type Candidate = {
  mbid: string | null
  name: string
  area?: string
  imagePromise: Promise<string | null>
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function weightedSample<T>(
  items: T[],
  count: number,
  getWeight: (item: T) => number
): T[] {
  const remaining = [...items]
  const picked: T[] = []

  while (remaining.length > 0 && picked.length < count) {
    const weights = remaining.map(item => Math.max(1, getWeight(item)))
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let cursor = Math.random() * total
    let index = 0

    for (; index < weights.length; index++) {
      cursor -= weights[index]
      if (cursor <= 0) break
    }

    picked.push(remaining.splice(Math.min(index, remaining.length - 1), 1)[0])
  }

  return picked
}

function hasCover(cover: CoverSource): boolean {
  return cover.kind !== 'none'
}

function preferCovered<T extends { cover: CoverSource }>(items: T[]): T[] {
  const shuffled = shuffle(items)
  return [
    ...shuffled.filter(item => hasCover(item.cover)),
    ...shuffled.filter(item => !hasCover(item.cover)),
  ]
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function emptySimilarContent(): SimilarContentResult {
  return { artists: [], albums: [] }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null

  const timer = new Promise<T>(resolve => {
    timeout = setTimeout(() => resolve(fallback), ms)
  })

  try {
    return await Promise.race([promise, timer])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

async function fetchSimilarContentViaLastFm(
  seeds: { id?: string; name: string; mbid?: string | null }[]
): Promise<SimilarContentResult | null> {
  const validSeeds = shuffle(seeds).filter(s => s.name.toLowerCase() !== 'various artists')
  if (!validSeeds.length) return null

  // Fetch all seeds in parallel
  const seedResults = await Promise.all(
    validSeeds.map(seed => getLastFmSimilarArtists(RAWARR_URL, seed.name, POOL_SIZE * 3))
  )

  const seen = new Set<string>()
  const candidates: (Candidate & { mbid: string })[] = []

  for (const similar of seedResults.map(r => shuffle(r))) {
    for (const s of similar) {
      if (candidates.length >= POOL_SIZE) break
      if (!s.mbid) continue
      if (seen.has(s.mbid)) continue
      seen.add(s.mbid)
      candidates.push({
        mbid: s.mbid,
        name: s.name,
        imagePromise: Promise.resolve(null),
      })
    }
    if (candidates.length >= POOL_SIZE) break
  }

  if (!candidates.length) return null

  const displayCandidates = candidates.slice(0, TARGET_ARTISTS)
  const albumCandidates = candidates.slice(TARGET_ARTISTS)
  const artists = (await Promise.all(
    displayCandidates.map(async c => {
      const artist = await deezer.resolveDeezerArtistByName(c.name)
      if (!artist) return null
      const [albums, topTracks] = await Promise.all([
        deezer.getDeezerArtistAlbums(artist.id, 1, artist),
        deezer.getDeezerArtistTopTracks(artist.id, 1),
      ])
      if (!albums.length && !topTracks.length) return null
      return artist
    })
  )).filter(Boolean) as ExternalArtistBase[]

  const seenAlbums = new Set<string>()
  const albums: ExternalAlbumBase[] = []
  const albumGroups = await Promise.all(
    albumCandidates.map(async candidate => {
      const artist = await deezer.resolveDeezerArtistByName(candidate.name)
      if (!artist) return []
      return deezer.getDeezerArtistAlbums(artist.id, MAX_ALBUMS_PER_ARTIST + 3, artist)
    })
  )
  for (const a of shuffle(albumGroups.flat())) {
    if (albums.length >= TARGET_ALBUMS) break
    if (!seenAlbums.has(a.id)) {
      seenAlbums.add(a.id)
      albums.push(a)
    }
  }

  return {
    artists: preferCovered(artists).slice(0, TARGET_ARTISTS),
    albums: preferCovered(albums).slice(0, TARGET_ALBUMS),
  }
}

async function fetchSimilarContent(
  seeds: { id?: string; name: string; mbid?: string | null }[]
): Promise<SimilarContentResult> {
  // Fast path: LastFM via rawarr-server
  const lastFmResult = await fetchSimilarContentViaLastFm(seeds)
  if (lastFmResult) return lastFmResult

  // Fallback: ListenBrainz + MusicBrainz
  const seen = new Set<string>()
  const candidates: (Candidate & { mbid: string })[] = []

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
        ? fetchArtistCommonsFilename(basic.wikidataId)
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
        const filename = await c.imagePromise
        return {
          id: c.mbid,
          name: c.name,
          subtext: c.area ?? '',
          cover: filename
            ? { kind: 'commons' as const, filename }
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

  return {
    artists: preferCovered(artists).slice(0, TARGET_ARTISTS),
    albums: preferCovered(albums).slice(0, TARGET_ALBUMS),
  }
}

export function useSimilarContent() {
  const { artists } = useArtists()
  const queryClient = useQueryClient()
  const artistPlayCounts = useSelector(selectArtistPlayCounts)

  const seedPool = useMemo(() => {
    return artists
      .map(a => ({ id: a.id, name: a.name, mbid: a.mbid }))
      .filter(a => a.name.trim())
  }, [artists])

  const selectedSeeds = useMemo(() => {
    const pool = [...seedPool]
      .sort((a, b) => (artistPlayCounts[b.id] ?? 0) - (artistPlayCounts[a.id] ?? 0))
      .slice(0, SEED_POOL_SIZE)

    return weightedSample(pool, SEED_COUNT, seed =>
      Math.sqrt((artistPlayCounts[seed.id] ?? 0) + 1)
    )
  }, [artistPlayCounts, seedPool])

  const queryKey = useMemo(
    () => [QueryKeys.ExploreSimilarContent, seedPool.map(s => s.id ?? s.name).sort().join(',')],
    [seedPool]
  )

  const query = useQuery({
    queryKey,
    queryFn: () => withTimeout(
      fetchSimilarContent(selectedSeeds),
      SIMILAR_CONTENT_TIMEOUT_MS,
      emptySimilarContent()
    ),
    enabled: seedPool.length > 0,
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'online',
  })

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  return {
    artists: (query.data?.artists ?? []).slice(0, TARGET_ARTISTS),
    albums: (query.data?.albums ?? []).slice(0, TARGET_ALBUMS),
    artistsReady: !query.isLoading,
    albumsReady: !query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    hasNoSeeds: seedPool.length === 0,
    refresh,
  }
}
