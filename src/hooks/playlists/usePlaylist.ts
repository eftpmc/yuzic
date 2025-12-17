import { useEffect, useState } from "react";
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

  const [isLoading, setIsLoading] = useState(!playlist);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const ensure = async () => {
      try {
        setIsLoading(true);
        await getPlaylist(id);
      } catch (err) {
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (!playlist) {
      ensure();
    } else {
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [id]);

  return { playlist, isLoading, error };
}