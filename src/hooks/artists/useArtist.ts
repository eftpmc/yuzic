import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Artist } from "@/types";
import { useLibrary } from "@/contexts/LibraryContext";
import { selectArtistById } from "@/utils/redux/librarySelectors";

type UseArtistResult = {
  artist: Artist | null;
  isLoading: boolean;
  error: Error | null;
};

export function useArtist(id: string): UseArtistResult {
  const artist = useSelector(selectArtistById(id));
  const { getArtist } = useLibrary();

  const [isLoading, setIsLoading] = useState(!artist);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const ensure = async () => {
      try {
        setIsLoading(true);
        await getArtist(id);
      } catch (err) {
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (!artist) {
      ensure();
    } else {
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [id]);

  return { artist, isLoading, error };
}