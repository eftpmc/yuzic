import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { getExploreDayKey, getExploreSeed, seededShuffle } from './useDailyLayout'
import type { CoverSource, ExternalArtistBase, ExternalAlbumBase } from '@/types'

const POOL_SIZE = 40
const MIN_ITEMS = 8
const TARGET_ARTISTS = 10
const PICK_ALBUM_ARTISTS = 20
const TARGET_ALBUMS = 10
const MAX_ALBUMS_PER_ARTIST = 2
const SEED_COUNT = 5
const SEED_POOL_SIZE = 20
const DEEZER_ARTIST_BATCH_SIZE = 4

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

function hasCover(cover: CoverSource): boolean {
  return cover.kind !== 'none'
}

function preferCovered<T extends { cover: CoverSource }>(items: T[], seed: number): T[] {
  const shuffled = seededShuffle(items, seed)
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
  seeds: { id?: string; name: string; mbid?: string | null }[],
  libraryArtistNames: Set<string>,
  dailySeed: number
): Promise<SimilarContentResult | null> {
  const validSeeds = seededShuffle(seeds, dailySeed + 1).filter(s => s.name.toLowerCase() !== 'various artists')
  if (!validSeeds.length) return null

  // Fetch all seeds in parallel
  const seedResults = await Promise.all(
    validSeeds.map(seed => getLastFmSimilarArtists(RAWARR_URL, seed.name, POOL_SIZE * 3))
  )

  const seen = new Set<string>()
  const candidates: (Candidate & { mbid: string })[] = []

  for (const similar of seedResults.map((r, index) => seededShuffle(r, dailySeed + 10 + index))) {
    for (const s of similar) {
      if (candidates.length >= POOL_SIZE) break
      if (libraryArtistNames.has(s.name.toLowerCase())) continue
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

  const displayCandidates = candidates.slice(0, TARGET_ARTISTS + 8)
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

  const albums: ExternalAlbumBase[] = []
  const seenAlbums = new Set<string>()
  const shuffledAlbumCandidates = seededShuffle(albumCandidates, dailySeed + 20)
  for (
    let i = 0;
    i < shuffledAlbumCandidates.length && albums.length < TARGET_ALBUMS;
    i += DEEZER_ARTIST_BATCH_SIZE
  ) {
    const albumGroups = await Promise.allSettled(
      shuffledAlbumCandidates.slice(i, i + DEEZER_ARTIST_BATCH_SIZE).map(async candidate => {
        const artist = await deezer.resolveDeezerArtistByName(candidate.name)
        if (!artist) return []
        return deezer.getDeezerArtistAlbums(artist.id, MAX_ALBUMS_PER_ARTIST + 3, artist)
      })
    )

    for (const result of albumGroups) {
      if (albums.length >= TARGET_ALBUMS) break
      if (result.status !== 'fulfilled') continue
      for (const album of seededShuffle(result.value, dailySeed + 21 + albums.length)) {
        if (albums.length >= TARGET_ALBUMS) break
        if (seenAlbums.has(album.id)) continue
        seenAlbums.add(album.id)
        albums.push(album)
      }
    }
  }

  const preferredArtists = preferCovered(artists, dailySeed + 30).slice(0, TARGET_ARTISTS)
  const preferredAlbums = preferCovered(albums, dailySeed + 31).slice(0, TARGET_ALBUMS)

  if (preferredArtists.length < MIN_ITEMS || preferredAlbums.length < MIN_ITEMS) return null

  return { artists: preferredArtists, albums: preferredAlbums }
}

async function fetchSimilarContent(
  seeds: { id?: string; name: string; mbid?: string | null }[],
  libraryArtistNames: Set<string>,
  dailySeed: number
): Promise<SimilarContentResult> {
  // Fast path: LastFM via rawarr-server
  const lastFmResult = await fetchSimilarContentViaLastFm(seeds, libraryArtistNames, dailySeed)
  if (lastFmResult) return lastFmResult

  // Fallback: ListenBrainz + MusicBrainz
  const seen = new Set<string>()
  const candidates: (Candidate & { mbid: string })[] = []

  for (const seed of seededShuffle(seeds, dailySeed + 100)) {
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

    const similarMbids = seededShuffle(
      similar.map(s => s.artist_mbid).filter(m => !seen.has(m)),
      dailySeed + 110 + candidates.length
    )

    for (const similarMbid of similarMbids) {
      if (candidates.length >= POOL_SIZE) break
      if (seen.has(similarMbid)) continue
      seen.add(similarMbid)

      const basic = await sharedMusicBrainzQueue.run(() => getArtistBasic(similarMbid))
      if (!basic) continue
      if (libraryArtistNames.has(basic.name.toLowerCase())) continue

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

  const displayCandidates = candidates.slice(0, TARGET_ARTISTS + 8)
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
      return seededShuffle(result, dailySeed + 130).slice(0, TARGET_ALBUMS)
    })(),
  ])

  const preferredArtists = preferCovered(artists, dailySeed + 140).slice(0, TARGET_ARTISTS)
  const preferredAlbums = preferCovered(albums, dailySeed + 141).slice(0, TARGET_ALBUMS)

  return {
    artists: preferredArtists.length >= MIN_ITEMS ? preferredArtists : [],
    albums: preferredAlbums.length >= MIN_ITEMS ? preferredAlbums : [],
  }
}

export function useSimilarContent() {
  const { artists } = useArtists()
  const artistPlayCounts = useSelector(selectArtistPlayCounts)
  const dayKey = getExploreDayKey()
  const dailySeed = getExploreSeed(dayKey)
  const libraryArtistNames = useMemo(
    () => new Set(artists.map(a => a.name.toLowerCase())),
    [artists]
  )
  const libraryArtistKey = useMemo(
    () => [...libraryArtistNames].sort().join(','),
    [libraryArtistNames]
  )

  const seedPool = useMemo(() => {
    return artists
      .map(a => ({ id: a.id, name: a.name, mbid: a.mbid }))
      .filter(a => a.name.trim())
  }, [artists])

  const selectedSeeds = useMemo(() => {
    const pool = [...seedPool]
      .sort((a, b) => (artistPlayCounts[b.id] ?? 0) - (artistPlayCounts[a.id] ?? 0))
      .slice(0, SEED_POOL_SIZE)

    return seededShuffle(pool, dailySeed).slice(0, SEED_COUNT)
  }, [artistPlayCounts, dailySeed, seedPool])

  const queryKey = useMemo(
    () => [QueryKeys.ExploreSimilarContent, dayKey, seedPool.map(s => s.id ?? s.name).sort().join(','), libraryArtistKey],
    [dayKey, seedPool, libraryArtistKey]
  )

  const query = useQuery({
    queryKey,
    queryFn: () => withTimeout(
      fetchSimilarContent(selectedSeeds, libraryArtistNames, dailySeed),
      SIMILAR_CONTENT_TIMEOUT_MS,
      emptySimilarContent()
    ),
    enabled: seedPool.length > 0,
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'online',
  })

  return {
    artists: (query.data?.artists ?? []).slice(0, TARGET_ARTISTS),
    albums: (query.data?.albums ?? []).slice(0, TARGET_ALBUMS),
    artistsReady: !query.isLoading,
    albumsReady: !query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    hasNoSeeds: seedPool.length === 0,
  }
}
