import { useQuery } from '@tanstack/react-query';
import { resolveArtistMbid } from '@/utils/musicbrainz/resolveArtistMbid';
import { staleTime } from '@/constants/staleTime';

export type UseArtistMbidInput = {
  id?: string | null;
  name: string;
} | null;

export function useArtistMbid(input: UseArtistMbidInput) {
  return useQuery({
    queryKey: ['artist-mbid', input?.id ?? input?.name ?? ''],
    enabled: !!input?.name?.trim(),
    staleTime: staleTime.musicbrainz,
    queryFn: async (): Promise<string | null> => {
      if (!input?.name?.trim()) return null;
      return resolveArtistMbid(input.id ?? undefined, input.name);
    },
  });
}
