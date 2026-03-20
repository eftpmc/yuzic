import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';

type UseGenresResult = {
  genres: string[];
  isLoading: boolean;
  error: Error | null;
};

export function useGenres(): UseGenresResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { genres: libraryGenres } = useLibrary();

  const query = useQuery<string[], Error>({
    queryKey: [QueryKeys.Genres, activeServer?.id],
    queryFn: api.genres.list,
    enabled: !!activeServer?.id,
    staleTime: staleTime.genres,
  });

  return {
    genres: query.data ?? libraryGenres,
    isLoading: query.isLoading && libraryGenres.length === 0,
    error: query.error ?? null,
  };
}
