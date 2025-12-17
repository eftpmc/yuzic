import { RootState } from "@/utils/redux/store";

export const selectIsSongInPlaylist =
  (playlistId: string, songId: string) =>
  (state: RootState) => {
    const playlist = state.library.playlistsById[playlistId];
    return playlist?.songs?.some(s => s.id === songId) ?? false;
  };