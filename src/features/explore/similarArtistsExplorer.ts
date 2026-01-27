import * as listenbrainz from '@/api/listenbrainz'
import * as musicbrainz from '@/api/musicbrainz'
import { resolveArtistMbid } from '@/utils/musicbrainz/resolveArtistMbid'
import {
  addSimilarArtist,
  addAlbumsToArtist,
  mapServerArtistToMbid,
} from '@/utils/redux/slices/exploreSlice'
import { AppDispatch } from '@/utils/redux/store'
import store from '@/utils/redux/store'
import { RequestQueue } from './requestQueue'

const SIMILAR_PER_SEED = 8
const ALBUMS_PER_ARTIST = 3

type SeedArtist = {
  id?: string
  name: string
}

export class SimilarArtistsExplorer {
  private musicBrainzQueue = new RequestQueue(1500)
  private listenBrainzQueue = new RequestQueue(400)

  async request(
    dispatch: AppDispatch,
    seeds: SeedArtist[],
    targetArtistCount: number
  ) {
    for (const seed of seeds) {
      const state = store.getState()

      if (state.explore.artistOrder.length >= targetArtistCount)
        return

      if (seed.name.toLowerCase() === 'various artists')
        continue

      let mbid =
        seed.id &&
        seed.id.includes('-')
          ? seed.id
          : seed.id
          ? state.explore.serverArtistMbidMap[seed.id]
          : undefined

      if (!mbid) {
        const resolved = await this.musicBrainzQueue.run(() =>
          resolveArtistMbid(undefined, seed.name)
        )
        if (!resolved) continue
        mbid = resolved

        if (seed.id) {
          dispatch(
            mapServerArtistToMbid({
              serverArtistId: seed.id,
              mbid,
            })
          )
        }
      }

      const similar = await this.listenBrainzQueue.run(() =>
        listenbrainz.getSimilarArtists(mbid, {
          limit: SIMILAR_PER_SEED,
        })
      )

      for (const s of similar) {
        const innerState = store.getState()

        if (innerState.explore.artistsById[s.artist_mbid])
          continue

        if (
          innerState.explore.artistOrder.length >=
          targetArtistCount
        )
          return

        const artist = await this.musicBrainzQueue.run(() =>
          musicbrainz.getArtist(s.artist_mbid)
        )
        if (!artist) continue

        dispatch(addSimilarArtist(artist))

        const albums = await this.musicBrainzQueue.run(() =>
          musicbrainz.getArtistAlbums(
            artist.id,
            artist.name
          )
        )

        dispatch(
          addAlbumsToArtist({
            artistId: artist.id,
            albums: albums.slice(0, ALBUMS_PER_ARTIST),
          })
        )
      }
    }
  }
}

export const similarArtistsExplorer =
  new SimilarArtistsExplorer()