import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useArtists } from '@/hooks/artists'
import * as deezer from '@/api/deezer'
import { getLastFmSimilarArtists } from '@/api/rawarr/lastfm/getSimilarArtists'
import { RAWARR_URL } from '@/constants/rawarr'
import { QueryKeys } from '@/enums/queryKeys'
import { selectArtistPlayCounts } from '@/utils/redux/selectors/statsSelectors'
import { getExploreDayKey, getExploreSeed, seededShuffle } from './useDailyLayout'
import type { CoverSource, ExternalArtistBase, ExternalAlbumBase } from '@/types'

const POOL_SIZE = 40
const MIN_ITEMS = 8
const TARGET_ARTISTS = 10
const TARGET_ALBUMS = 10
const MAX_ALBUMS_PER_ARTIST = 2
const SEED_COUNT = 5
const SEED_POOL_SIZE = 20
const DEEZER_ARTIST_BATCH_SIZE = 4

const SIMILAR_CONTENT_TIMEOUT_MS = 15000

type SimilarContentResult = {
  artists: ExternalArtistBase[]
  albums: ExternalAlbumBase[]
}

type Candidate = {
  name: string
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
  const candidates: Candidate[] = []

  for (const similar of seedResults.map((r, index) => seededShuffle(r, dailySeed + 10 + index))) {
    for (const s of similar) {
      const name = s.name.trim()
      const key = name.toLowerCase()
      if (candidates.length >= POOL_SIZE) break
      if (!key || libraryArtistNames.has(key)) continue
      if (seen.has(key)) continue
      seen.add(key)
      candidates.push({ name })
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

  return {
    artists: preferredArtists.length >= MIN_ITEMS ? preferredArtists : [],
    albums: preferredAlbums.length >= MIN_ITEMS ? preferredAlbums : [],
  }
}

async function fetchSimilarContent(
  seeds: { id?: string; name: string; mbid?: string | null }[],
  libraryArtistNames: Set<string>,
  dailySeed: number
): Promise<SimilarContentResult> {
  const lastFmResult = await fetchSimilarContentViaLastFm(seeds, libraryArtistNames, dailySeed)
  return lastFmResult ?? emptySimilarContent()
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
