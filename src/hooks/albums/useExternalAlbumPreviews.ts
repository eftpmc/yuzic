import { useQuery } from '@tanstack/react-query';
import { ExternalAlbum } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { fetchPreviewsForExternalAlbum } from './previewUtils';

export function useExternalAlbumPreviews(album: ExternalAlbum | null): Record<string, string> {
  const { data } = useQuery({
    queryKey: [QueryKeys.ExternalAlbumPreviews, album?.id],
    enabled: !!album,
    staleTime: 1000 * 60 * 60,
    queryFn: () => fetchPreviewsForExternalAlbum(album!),
  });
  return data ?? {};
}
