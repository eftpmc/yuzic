import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ExternalArtistBase, ExternalAlbumBase } from '@/types'

type SimilarArtistEntry = {
  artist: ExternalArtistBase
  albums: ExternalAlbumBase[]
}

type GenreEntry = {
  genre: string
  albums: ExternalAlbumBase[]
}

type ExploreState = {
  artistsById: Record<string, SimilarArtistEntry>
  artistOrder: string[]

  genresByName: Record<string, GenreEntry>

  serverArtistMbidMap: Record<string, string>

  newDataAvailable: boolean
  hasInitialFill: boolean
}

const initialState: ExploreState = {
  artistsById: {},
  artistOrder: [],

  genresByName: {},

  serverArtistMbidMap: {},

  newDataAvailable: false,
  hasInitialFill: false,
}

const exploreSlice = createSlice({
  name: 'explore',
  initialState,
  reducers: {
    addSimilarArtist(
      state,
      action: PayloadAction<ExternalArtistBase>
    ) {
      if (state.artistsById[action.payload.id]) return

      state.artistsById[action.payload.id] = {
        artist: action.payload,
        albums: [],
      }

      state.artistOrder.push(action.payload.id)
      state.newDataAvailable = true
    },

    addAlbumsToArtist(
      state,
      action: PayloadAction<{
        artistId: string
        albums: ExternalAlbumBase[]
      }>
    ) {
      const entry = state.artistsById[action.payload.artistId]
      if (!entry) return

      const existing = new Set(
        entry.albums.map(a => `${a.artist}-${a.title}`)
      )

      for (const album of action.payload.albums) {
        const key = `${album.artist}-${album.title}`
        if (!existing.has(key)) {
          entry.albums.push(album)
          state.newDataAvailable = true
        }
      }
    },

    addGenre(state, action: PayloadAction<string>) {
      if (state.genresByName[action.payload]) return

      state.genresByName[action.payload] = {
        genre: action.payload,
        albums: [],
      }
    },

    addAlbumsToGenre(
      state,
      action: PayloadAction<{
        genre: string
        albums: ExternalAlbumBase[]
      }>
    ) {
      const entry = state.genresByName[action.payload.genre]
      if (!entry) return

      const existing = new Set(entry.albums.map(a => a.id))

      for (const album of action.payload.albums) {
        if (!existing.has(album.id)) {
          entry.albums.push(album)
          state.newDataAvailable = true
        }
      }
    },

    mapServerArtistToMbid(
      state,
      action: PayloadAction<{
        serverArtistId: string
        mbid: string
      }>
    ) {
      state.serverArtistMbidMap[action.payload.serverArtistId] =
        action.payload.mbid
    },

    markInitialFillComplete(state) {
      state.hasInitialFill = true
    },

    clearExploreNewData(state) {
      state.newDataAvailable = false
    },

    resetExplore() {
      return initialState
    },
  },
})

export const {
  addSimilarArtist,
  addAlbumsToArtist,
  addGenre,
  addAlbumsToGenre,
  mapServerArtistToMbid,
  markInitialFillComplete,
  clearExploreNewData,
  resetExplore,
} = exploreSlice.actions

export default exploreSlice.reducer