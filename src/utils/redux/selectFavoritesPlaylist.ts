import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/utils/redux/store";

export const selectFavoritesPlaylist = createSelector(
  [(state: RootState) => state.library.starred.songs],
  (songs) => {
    return {
      id: "favorites",
      title: "Favorites",
      cover: "heart-icon",
      subtext: `Playlist • ${songs.length} songs`,
      songs,
    };
  }
);