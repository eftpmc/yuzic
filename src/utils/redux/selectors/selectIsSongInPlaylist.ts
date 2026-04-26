import { RootState } from "@/utils/redux/store";

export const selectIsSongInPlaylist =
  (playlistId: string, songId: string) =>
  (state: RootState) => {
    const playlist = state.library.playlists.find(p => p.id === playlistId);
    return playlist?.songs?.some((s: { id: string }) => s.id === songId) ?? false;
  };