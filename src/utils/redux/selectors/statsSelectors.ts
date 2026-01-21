import { RootState } from "@/utils/redux/store";

export const selectSongPlays = (state: RootState) =>
  state.stats.songPlays;

export const selectAlbumPlays = (state: RootState) =>
  state.stats.albumPlays;

export const selectArtistPlays = (state: RootState) =>
  state.stats.artistPlays;

export const selectSongPlayCount =
  (songId: string) => (state: RootState) =>
    state.stats.songPlays[songId] ?? 0;

export const selectAlbumPlayCount =
  (albumId: string) => (state: RootState) =>
    state.stats.albumPlays[albumId] ?? 0;

export const selectArtistPlayCount =
  (artistId: string) => (state: RootState) =>
    state.stats.artistPlays[artistId] ?? 0;