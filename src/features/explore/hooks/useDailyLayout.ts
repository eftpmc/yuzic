import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useArtists } from '@/hooks/artists'
import { useIsOffline } from '@/hooks/useIsOffline'
import { selectArtistPlayCounts } from '@/utils/redux/selectors/statsSelectors'
import { selectLibraryGenres } from '@/utils/redux/selectors/librarySelectors'

const BECAUSE_SEED_COUNT = 3
const GENRE_COUNT = 2

export type SectionType =
  | 'recentlyPlayed'
  | 'recentlyAdded'
  | 'newReleases'
  | 'becauseYouListened'
  | 'artistsForYou'
  | 'favoriteAlbums'
  | 'randomAlbums'
  | 'charts'
  | 'genre'

export type SectionConfig = {
  key: string
  type: SectionType
  artistName?: string
  genre?: string
}

function dateToSeed(dateStr: string): number {
  let hash = 0
  for (const c of dateStr) hash = Math.imul(31, hash) + c.charCodeAt(0) | 0
  return Math.abs(hash)
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = (seed * 2 ** 31) | 0
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s, 1664525) + 1013904223
    const j = Math.abs(s) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}


export function useDailyLayout(): SectionConfig[] {
  const isOffline = useIsOffline()
  const { artists: libraryArtists } = useArtists()
  const artistPlayCounts = useSelector(selectArtistPlayCounts)
  const libraryGenres = useSelector(selectLibraryGenres)

  const becauseSeeds = useMemo(() => {
    return [...libraryArtists]
      .filter(a => a.name.trim() && a.name.toLowerCase() !== 'various artists')
      .sort((a, b) => (artistPlayCounts[b.id] ?? 0) - (artistPlayCounts[a.id] ?? 0))
      .slice(0, BECAUSE_SEED_COUNT)
      .map(a => a.name)
  }, [libraryArtists, artistPlayCounts])

  const topGenres = useMemo(() => {
    if (!libraryGenres.length) return []
    const seed = dateToSeed(new Date().toDateString())
    return seededShuffle([...libraryGenres], seed).slice(0, GENRE_COUNT)
  }, [libraryGenres])

  return useMemo((): SectionConfig[] => {
    const hasLibrary = libraryArtists.length > 0
    const pool: SectionConfig[] = []

    pool.push({ key: 'recentlyPlayed', type: 'recentlyPlayed' })
    pool.push({ key: 'recentlyAdded', type: 'recentlyAdded' })
    pool.push({ key: 'favoriteAlbums', type: 'favoriteAlbums' })
    pool.push({ key: 'randomAlbums', type: 'randomAlbums' })

    if (!isOffline) {
      pool.push({ key: 'charts', type: 'charts' })

      if (hasLibrary) {
        pool.push({ key: 'newReleases', type: 'newReleases' })
        pool.push({ key: 'artistsForYou', type: 'artistsForYou' })
        for (const name of becauseSeeds) {
          pool.push({ key: `becauseYouListened:${name}`, type: 'becauseYouListened', artistName: name })
        }
        for (const genre of topGenres) {
          pool.push({ key: `genre:${genre}`, type: 'genre', genre })
        }
      }
    }

    const seed = dateToSeed(new Date().toDateString())
    return seededShuffle(pool, seed)
  }, [isOffline, libraryArtists.length, becauseSeeds, topGenres])
}
