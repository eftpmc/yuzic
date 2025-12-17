import { useEffect, useState } from 'react';
import { useApi } from '@/api';

type StarredState = {
  albums: Set<string>;
  artists: Set<string>;
  songs: Set<string>;
};

type UseStarredResult = {
  starred: StarredState;
  isLoading: boolean;
  error: Error | null;
};

export function useStarred(): UseStarredResult {
  const api = useApi();

  const [starred, setStarred] = useState<StarredState>({
    albums: new Set(),
    artists: new Set(),
    songs: new Set(),
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await api.starred.list();

        if (!mounted) return;

        setStarred({
          albums: new Set(result.albumIds),
          artists: new Set(result.artistIds),
          songs: new Set(result.songIds),
        });
      } catch (err) {
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return { starred, isLoading, error };
}