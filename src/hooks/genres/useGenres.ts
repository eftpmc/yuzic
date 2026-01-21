import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { GenreListing } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';

type UseGenresResult = {
  genres: GenreListing[];
  isLoading: boolean;
  error: Error | null;
};

export function useGenres(): UseGenresResult {
  const api = useApi();

  const query = useQuery<GenreListing[], Error>({
    queryKey: [QueryKeys.Genres],
    queryFn: api.genres.list,
    staleTime: staleTime.genres,
  });

  return {
    genres: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}