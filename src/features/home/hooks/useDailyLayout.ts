import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useAlbums } from '@/hooks/albums'
import { useArtists } from '@/hooks/artists'
import { useIsOffline } from '@/hooks/useIsOffline'
import { selectArtistPlayCounts } from '@/utils/redux/selectors/statsSelectors'
import { selectLibraryGenres } from '@/utils/redux/selectors/librarySelectors'
import { presentableGenres } from '../genres'
import {
  buildDiscoverySections,
  buildLibrarySections,
  buildResumeSections,
} from '../homeLayout'

const BECAUSE_SEED_COUNT = 1
const BECAUSE_SEED_POOL_SIZE = 20
const GENRE_COUNT = 1

export type SectionType =
  | 'quickPicks'
  | 'recentlyPlayed'
  | 'continuePlaying'
  | 'recentlyAdded'
  | 'becauseYouListened'
  | 'topArtists'
  | 'mostPlayed'
  | 'charts'
  | 'genre'
  | 'serverRandom'
  | 'serverNowPlaying'
  | 'lbSimilarArtistsForYou'

export type SectionConfig = {
  key: string
  type: SectionType
  artistName?: string
  genre?: string
}

export function getDayKey(date = new Date()): string {
  return date.toDateString()
}

function dateToSeed(dateStr: string): number {
  let hash = 0
  for (const c of dateStr) hash = Math.imul(31, hash) + c.charCodeAt(0) | 0
  return Math.abs(hash)
}

export function getDailySeed(dayKey = getDayKey()): number {
  return dateToSeed(dayKey)
}

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = Math.imul(seed | 0, 0x9e3779b9) | 0 || 1
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s, 1664525) + 1013904223
    const j = Math.abs(s) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}


export type HomeLayout = {
  /** What you were listening to. First, unlabelled. */
  resume: SectionConfig[]
  /** Your own collection, behind its own header. */
  library: SectionConfig[]
  /** Server-native discovery (random shelves, now-playing) — behind the
   * server source header. Independent of Deezer/LB. */
  server: SectionConfig[]
  /** ListenBrainz-driven discovery (similar-artist expansions, later
   * Weekly/Daily recs) — behind the LB source header. */
  listenbrainz: SectionConfig[]
  /** Deezer external discovery, behind the source header. */
  deezer: SectionConfig[]
  isOffline: boolean
}

export function useDailyLayout(refreshKey = 0): HomeLayout {
  const isOffline = useIsOffline()
  const { albums: libraryAlbums } = useAlbums()
  const { artists: libraryArtists } = useArtists()
  const artistPlayCounts = useSelector(selectArtistPlayCounts)
  const libraryGenres = useSelector(selectLibraryGenres)
  const dayKey = getDayKey()
  const dailySeed = getDailySeed(`${dayKey}:${refreshKey}`)

  const artistSeedPool = useMemo(() => {
    return seededShuffle(
      [...libraryArtists]
        .filter(a => a.name.trim() && a.name.toLowerCase() !== 'various artists')
        .sort((a, b) => (artistPlayCounts[b.id] ?? 0) - (artistPlayCounts[a.id] ?? 0))
        .slice(0, BECAUSE_SEED_POOL_SIZE),
      dailySeed
    )
  }, [dailySeed, libraryArtists, artistPlayCounts])

  const becauseSeeds = useMemo(
    () => artistSeedPool.slice(0, BECAUSE_SEED_COUNT).map(a => a.name),
    [artistSeedPool]
  )

  const availableGenres = useMemo(() => {
    const genres: string[] = [...libraryGenres]
    // Supplement from album tags, but cap at 500 albums — scanning all 9000 for
    // a handful of genre seeds isn't worth it when the server genre list covers most cases.
    const scanLimit = Math.min(libraryAlbums.length, 500)
    for (let i = 0; i < scanLimit; i++) {
      const albumGenres = libraryAlbums[i].genres
      if (albumGenres) genres.push(...albumGenres)
    }
    // Placeholder tags ("Unknown", "Other") are the biggest bucket in most
    // libraries, so a shuffle picks them far more often than a real genre —
    // and "More Unknown" is not a shelf anybody wants.
    return presentableGenres(genres)
  }, [libraryAlbums, libraryGenres])

  const topGenres = useMemo(() => {
    if (!availableGenres.length) return []
    return seededShuffle(availableGenres, dailySeed).slice(0, GENRE_COUNT)
  }, [availableGenres, dailySeed])

  const hasLibrary = libraryArtists.length > 0 || libraryAlbums.length > 0

  const resume = useMemo(() => buildResumeSections(), [])

  const library = useMemo(() => buildLibrarySections(hasLibrary), [hasLibrary])

  const deezer = useMemo(
    () => seededShuffle(
      buildDiscoverySections({
        isOffline,
        hasLibrary: libraryArtists.length > 0,
        becauseSeeds,
        topGenres,
      }),
      dailySeed
    ),
    [dailySeed, isOffline, libraryArtists.length, becauseSeeds, topGenres]
  )

  // Server-native tier — cheap, always-on when a library exists. Random
  // shelves keep Home changing day-to-day even for users with no external
  // discovery configured; now-playing is opt-in visible when it has data.
  const server = useMemo<SectionConfig[]>(() => {
    if (isOffline || !hasLibrary) return []
    return [
      { key: 'serverRandom', type: 'serverRandom' },
      { key: 'serverNowPlaying', type: 'serverNowPlaying' },
    ]
  }, [isOffline, hasLibrary])

  // ListenBrainz tier — the seed's MBID comes from the library where the
  // server carries one and from a MusicBrainz lookup where it doesn't, so a
  // seed artist name is all this tier needs.
  const listenbrainz = useMemo<SectionConfig[]>(() => {
    if (isOffline || !hasLibrary || becauseSeeds.length === 0) return []
    return [
      { key: 'lbSimilarArtistsForYou', type: 'lbSimilarArtistsForYou', artistName: becauseSeeds[0] },
    ]
  }, [isOffline, hasLibrary, becauseSeeds])

  return useMemo(
    () => ({ resume, library, server, listenbrainz, deezer, isOffline }),
    [resume, library, server, listenbrainz, deezer, isOffline]
  )
}
