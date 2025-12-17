import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Album } from "@/types";
import { useLibrary } from "@/contexts/LibraryContext";
import { selectAlbumById } from "@/utils/redux/librarySelectors";

type UseAlbumResult = {
  album: Album | null;
  isLoading: boolean;
  error: Error | null;
};

export function useAlbum(id: string): UseAlbumResult {
  const album = useSelector(selectAlbumById(id));
  const { getAlbum } = useLibrary();

  const [isLoading, setIsLoading] = useState(!album);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const ensure = async () => {
      try {
        setIsLoading(true);
        await getAlbum(id);
      } catch (err) {
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (!album) {
      ensure();
    } else {
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [id]);

  return { album, isLoading, error };
}