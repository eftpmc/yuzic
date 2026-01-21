import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { AlbumBase } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';

type UseAlbumsResult = {
  albums: AlbumBase[];
  isLoading: boolean;
  error: Error | null;
};

export function useAlbums(): UseAlbumsResult {
  const api = useApi();

  const query = useQuery<AlbumBase[], Error>({
    queryKey: [QueryKeys.Albums],
    queryFn: api.albums.list,
    staleTime: staleTime.albums,
  });

  return {
    albums: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}