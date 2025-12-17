import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/utils/redux/store";
import { Playlist, Song } from "@/types";

export const selectFavoritesPlaylist = createSelector(
  [
    (state: RootState) => state.library.starred.songIds,
    (state: RootState) => state.library.albumsById,
  ],
  (songIds, albumsById): Playlist => {
    const allSongs: Song[] = Object.values(albumsById)
      .flatMap(album => album?.songs ?? []);

    const songs = allSongs.filter(song =>
      songIds.includes(song.id)
    );

    return {
      id: "favorites",
      title: "Favorites",
      cover: "heart-icon",
      songs,
      subtext: `Playlist • ${songs.length} songs`,
    };
  }
);