import { useQuery } from '@tanstack/react-query';
import { ExternalAlbum } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { fetchPreviewsForExternalAlbum } from './previewUtils';
import { useDeezerDiscoveryEnabled } from '@/features/home/hooks/useDeezerEnabled';

export function useExternalAlbumPreviews(album: ExternalAlbum | null): Record<string, string> {
  const samplesEnabled = useDeezerDiscoveryEnabled();
  const { data } = useQuery({
    queryKey: [QueryKeys.ExternalAlbumPreviews, album?.id],
    enabled: !!album && samplesEnabled,
    staleTime: 1000 * 60 * 60,
    queryFn: () => fetchPreviewsForExternalAlbum(album!),
  });
  return data ?? {};
}
