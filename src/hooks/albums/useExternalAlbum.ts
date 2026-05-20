import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { ExternalAlbum } from '@/types';
import { ALL_SOURCES } from '@/features/sources/registry';

type UseExternalAlbumInput = {
  source?: string;
  albumId: string;
  artist?: string;
  title?: string;
};

type UseExternalAlbumResult = {
  album: ExternalAlbum | null;
  isLoading: boolean;
  error: Error | null;
};

export function useExternalAlbum(
  albumIdOrInput: string | UseExternalAlbumInput
): UseExternalAlbumResult {
  const albumId = typeof albumIdOrInput === 'string' ? albumIdOrInput : albumIdOrInput.albumId;
  const source = typeof albumIdOrInput === 'string' ? undefined : albumIdOrInput.source;

  const query = useQuery<ExternalAlbum | null, Error>({
    queryKey: [QueryKeys.ExternalAlbum, source ?? 'unknown', albumId],
    enabled: !!albumId,
    staleTime: 1000 * 60 * 60 * 24,

    queryFn: async () => {
      const sourceDef = ALL_SOURCES.find(s => s.id === source);
      if (sourceDef) return sourceDef.fetchAlbum(albumId);
      return null;
    },
  });

  return {
    album: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}
