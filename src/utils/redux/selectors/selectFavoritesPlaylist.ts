import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/utils/redux/store";
import i18n from '@/i18n';

export const selectFavoritesPlaylist = createSelector(
  [(state: RootState) => state.library.starred.songs],
  (songs) => {
    return {
      id: "favorites",
      title: i18n.t('playlist.favoritesTitle'),
      cover: "heart-icon",
      subtext: i18n.t('playlist.subtext', { count: songs.length }),
      songs,
    };
  }
);