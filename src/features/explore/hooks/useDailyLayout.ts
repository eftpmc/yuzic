import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useAlbums } from '@/hooks/albums'
import { useArtists } from '@/hooks/artists'
import { useIsOffline } from '@/hooks/useIsOffline'
import { selectArtistPlayCounts } from '@/utils/redux/selectors/statsSelectors'
import { selectLibraryGenres } from '@/utils/redux/selectors/librarySelectors'

const BECAUSE_SEED_COUNT = 3
const BECAUSE_SEED_POOL_SIZE = 20
const GENRE_COUNT = 2

export type SectionType =
  | 'recentlyPlayed'
  | 'recentlyAdded'
  | 'newReleases'
  | 'becauseYouListened'
  | 'artistsForYou'
  | 'favoriteAlbums'
  | 'randomAlbums'
  | 'mostPlayed'
  | 'charts'
  | 'genre'

export type SectionConfig = {
  key: string
  type: SectionType
  artistName?: string
  genre?: string
}

export function getExploreDayKey(date = new Date()): string {
  return date.toDateString()
}

function dateToSeed(dateStr: string): number {
  let hash = 0
  for (const c of dateStr) hash = Math.imul(31, hash) + c.charCodeAt(0) | 0
  return Math.abs(hash)
}

export function getExploreSeed(dayKey = getExploreDayKey()): number {
  return dateToSeed(dayKey)
}

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = (seed * 2 ** 31) | 0
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s, 1664525) + 1013904223
    const j = Math.abs(s) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}


export type ExploreLayout = {
  local: SectionConfig[]
  deezer: SectionConfig[]
  isOffline: boolean
}

export function useDailyLayout(): ExploreLayout {
  const isOffline = useIsOffline()
  const { albums: libraryAlbums } = useAlbums()
  const { artists: libraryArtists } = useArtists()
  const artistPlayCounts = useSelector(selectArtistPlayCounts)
  const libraryGenres = useSelector(selectLibraryGenres)
  const dayKey = getExploreDayKey()
  const dailySeed = getExploreSeed(dayKey)

  const becauseSeeds = useMemo(() => {
    const pool = [...libraryArtists]
      .filter(a => a.name.trim() && a.name.toLowerCase() !== 'various artists')
      .sort((a, b) => (artistPlayCounts[b.id] ?? 0) - (artistPlayCounts[a.id] ?? 0))
      .slice(0, BECAUSE_SEED_POOL_SIZE)

    return seededShuffle(pool, dailySeed)
      .slice(0, BECAUSE_SEED_COUNT)
      .map(a => a.name)
  }, [dailySeed, libraryArtists, artistPlayCounts])

  const availableGenres = useMemo(() => {
    const genres = new Set<string>()
    libraryGenres.forEach(genre => {
      const normalized = genre.trim()
      if (normalized) genres.add(normalized)
    })
    libraryAlbums.forEach(album => {
      album.genres?.forEach(genre => {
        const normalized = genre.trim()
        if (normalized) genres.add(normalized)
      })
    })
    return [...genres]
  }, [libraryAlbums, libraryGenres])

  const topGenres = useMemo(() => {
    if (!availableGenres.length) return []
    return seededShuffle(availableGenres, dailySeed).slice(0, GENRE_COUNT)
  }, [availableGenres, dailySeed])

  const local = useMemo((): SectionConfig[] => [
    { key: 'recentlyPlayed', type: 'recentlyPlayed' },
    { key: 'recentlyAdded', type: 'recentlyAdded' },
    { key: 'mostPlayed', type: 'mostPlayed' },
    { key: 'favoriteAlbums', type: 'favoriteAlbums' },
    { key: 'randomAlbums', type: 'randomAlbums' },
  ], [])

  const deezer = useMemo((): SectionConfig[] => {
    if (isOffline) return []
    const hasLibrary = libraryArtists.length > 0
    const pool: SectionConfig[] = []

    if (hasLibrary) {
      pool.push({ key: 'newReleases', type: 'newReleases' })
      pool.push({ key: 'artistsForYou', type: 'artistsForYou' })
      for (const name of becauseSeeds) {
        pool.push({ key: `becauseYouListened:${name}`, type: 'becauseYouListened', artistName: name })
      }
      for (const genre of topGenres) {
        pool.push({ key: `genre:${genre}`, type: 'genre', genre })
      }
    } else {
      pool.push({ key: 'charts', type: 'charts' })
    }

    return seededShuffle(pool, dailySeed)
  }, [dailySeed, isOffline, libraryArtists.length, becauseSeeds, topGenres])

  return useMemo(() => ({ local, deezer, isOffline }), [local, deezer, isOffline])
}
