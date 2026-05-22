import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useAlbums } from '@/hooks/albums'
import { useArtists } from '@/hooks/artists'
import { useIsOffline } from '@/hooks/useIsOffline'
import { selectArtistPlayCounts } from '@/utils/redux/selectors/statsSelectors'
import { selectLibraryGenres } from '@/utils/redux/selectors/librarySelectors'

const BECAUSE_SEED_COUNT = 1
const BECAUSE_SEED_POOL_SIZE = 20
const GENRE_COUNT = 1

export type SectionType =
  | 'recentlyPlayed'
  | 'recentlyAdded'
  | 'becauseYouListened'
  | 'topArtists'
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
  local: SectionConfig[]
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
    const genres = new Set<string>()
    libraryGenres.forEach(genre => {
      const normalized = genre.trim()
      if (normalized) genres.add(normalized)
    })
    // Supplement from album tags, but cap at 500 albums — scanning all 9000 for
    // a handful of genre seeds isn't worth it when the server genre list covers most cases.
    const scanLimit = Math.min(libraryAlbums.length, 500)
    for (let i = 0; i < scanLimit; i++) {
      libraryAlbums[i].genres?.forEach(genre => {
        const normalized = genre.trim()
        if (normalized) genres.add(normalized)
      })
    }
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

    pool.push({ key: 'topArtists', type: 'topArtists' })
    pool.push({ key: 'charts', type: 'charts' })

    if (hasLibrary) {
      for (const name of becauseSeeds) {
        pool.push({ key: `becauseYouListened:${name}`, type: 'becauseYouListened', artistName: name })
      }
      for (const genre of topGenres) {
        pool.push({ key: `genre:${genre}`, type: 'genre', genre })
      }
    }

    return seededShuffle(pool, dailySeed)
  }, [dailySeed, isOffline, libraryArtists.length, becauseSeeds, topGenres])

  return useMemo(() => ({ local, deezer, isOffline }), [local, deezer, isOffline])
}
