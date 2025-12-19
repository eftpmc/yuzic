import { useEffect } from "react";
import { useSelector } from "react-redux";
import { Playlist } from "@/types";
import { useLibrary } from "@/contexts/LibraryContext";
import { selectPlaylistById } from "@/utils/redux/librarySelectors";

type UsePlaylistResult = {
  playlist: Playlist | null;
  isLoading: boolean;
  error: Error | null;
};

export function usePlaylist(id: string): UsePlaylistResult {
  const playlist = useSelector(selectPlaylistById(id));
  const { getPlaylist } = useLibrary();

  useEffect(() => {
    getPlaylist(id).catch(() => {
      /* optional error handling */
    });
  }, [id]);

  return {
    playlist,
    isLoading: !playlist && id !== "favorites",
    error: null,
  };
}