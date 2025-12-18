import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Playlist } from "@/types";
import { useLibrary } from "@/contexts/LibraryContext";
import {
  selectPlaylistById,
} from "@/utils/redux/librarySelectors";
import { selectFavoritesPlaylist } from "@/utils/redux/selectFavoritesPlaylist";

type UsePlaylistResult = {
  playlist: Playlist | null;
  isLoading: boolean;
  error: Error | null;
};

export function usePlaylist(id: string): UsePlaylistResult {
  const isFavorites = id === "favorites";

  const favorites = useSelector(selectFavoritesPlaylist);
  const playlist = useSelector(selectPlaylistById(id));
  const { getPlaylist } = useLibrary();

  const resolvedPlaylist = isFavorites ? favorites : playlist;

  const [isLoading, setIsLoading] = useState(
    !resolvedPlaylist && !isFavorites
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isFavorites) return;

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

  return {
    playlist: resolvedPlaylist ?? null,
    isLoading,
    error,
  };
}