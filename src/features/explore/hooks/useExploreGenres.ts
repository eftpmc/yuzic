import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/utils/redux/store'
import { shuffle } from '../utils/snapshot'

const GENRE_TARGET = 12

export function useExploreGenres(refreshKey: number) {
  const genresByName = useSelector(
    (state: RootState) => state.explore.genresByName
  )

  const data = useMemo(() => {
    const readyGenres = Object.values(genresByName)
      .filter(g => g.albums.length)

    return shuffle(readyGenres).slice(
      0,
      GENRE_TARGET
    )
  }, [genresByName, refreshKey])

  return {
    data,
    ready: data.length >= GENRE_TARGET,
  }
}