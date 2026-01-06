import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { Album } from '@/types';
import { useApi } from '@/api';

type UseAlbumResult = {
  album: Album | null;
  isLoading: boolean;
  error: Error | null;
};

export function useAlbum(id: string): UseAlbumResult {
  const api = useApi();

  const query = useQuery<Album, Error>({
    queryKey: [QueryKeys.Album, id],
    queryFn: () => api.albums.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    album: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}