import { AppDispatch } from '@/utils/redux/store'
import { markInitialFillComplete } from '@/utils/redux/slices/exploreSlice'
import { similarArtistsExplorer } from './similarArtistsExplorer'
import { genresExplorer } from './genresExplorer'
import { ApiAdapter } from '@/api/types'

const TARGET_ARTISTS = 20
const TARGET_GENRES = 12

export async function bootstrapExplore(
  dispatch: AppDispatch,
  api: ApiAdapter
) {
  const artists = await api.artists.list().catch(() => [])
  const genres = await api.genres.list().catch(() => [])

  if (artists.length) {
    await similarArtistsExplorer.request(
      dispatch,
      artists.map(a => ({ id: a.id, name: a.name })),
      TARGET_ARTISTS
    )
  }

  if (genres.length) {
    await genresExplorer.request(
      dispatch,
      genres.map(g => g.name),
      TARGET_GENRES
    )
  }

  dispatch(markInitialFillComplete())
}