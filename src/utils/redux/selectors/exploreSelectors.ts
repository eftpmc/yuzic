import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '@/utils/redux/store'

const selectArtistOrder = (state: RootState) =>
  state.explore.artistOrder

const selectArtistsById = (state: RootState) =>
  state.explore.artistsById

export const selectSimilarArtists = createSelector(
  [selectArtistOrder, selectArtistsById],
  (order, byId) => order.map(id => byId[id])
)

export const selectGenres = (state: RootState) =>
  Object.values(state.explore.genresByName)

export const selectServerArtistMbidMap = (
  state: RootState
) => state.explore.serverArtistMbidMap

export const selectExploreHasNewData = (
  state: RootState
) => state.explore.newDataAvailable

export const selectExploreHasInitialFill = (
  state: RootState
) => state.explore.hasInitialFill