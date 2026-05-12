import { RootState } from "@/utils/redux/store";

export const selectIsSongInPlaylist =
  (playlistId: string, songId: string) =>
  (_state: RootState) => false;
