import { getTopAlbumsForGenre } from '@/api/musicbrainz/genres/getTopAlbumsForGenre'
import {
  addAlbumsToGenre,
  addGenre,
} from '@/utils/redux/slices/exploreSlice'
import { AppDispatch } from '@/utils/redux/store'
import store from '@/utils/redux/store'
import { RequestQueue } from './requestQueue'

const GENRE_ALBUM_TARGET = 12

export class GenresExplorer {
  private musicBrainzQueue = new RequestQueue(1500)

  async request(
    dispatch: AppDispatch,
    genres: string[],
    targetGenreCount: number
  ) {
    let filled = 0

    for (const genre of genres) {
      if (filled >= targetGenreCount) return

      let entry = store.getState().explore.genresByName[genre]

      if (!entry) {
        dispatch(addGenre(genre))
        entry = store.getState().explore.genresByName[genre]
      }

      if (entry.albums.length) {
        filled++
        continue
      }

      const albums = await this.musicBrainzQueue.run(() =>
        getTopAlbumsForGenre(genre, GENRE_ALBUM_TARGET)
      )

      dispatch(
        addAlbumsToGenre({
          genre,
          albums,
        })
      )

      filled++
    }
  }
}

export const genresExplorer = new GenresExplorer()