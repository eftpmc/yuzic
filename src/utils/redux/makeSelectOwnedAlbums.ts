import { createSelector } from '@reduxjs/toolkit';
import { RootState } from "@/utils/redux/store";
import { Artist } from '@/types';

export const makeSelectOwnedAlbums = () =>
  createSelector(
    [
      (state: RootState) => state.library.albumsById,
      (_: RootState, artist: Artist) => artist.ownedAlbums,
    ],
    (albumsById, ownedAlbums) =>
      ownedAlbums
        .map(a => albumsById[a.id])
        .filter(Boolean)
  );