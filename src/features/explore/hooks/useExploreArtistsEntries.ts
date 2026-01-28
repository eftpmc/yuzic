import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QueryKeys } from '@/enums/queryKeys'
import type { SimilarArtistEntry } from '../exploreCache'

export function useExploreArtistsEntries(): SimilarArtistEntry[] {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: [QueryKeys.ExploreArtists],
    queryFn: () =>
      (queryClient.getQueryData<SimilarArtistEntry[]>([
        QueryKeys.ExploreArtists,
      ]) ?? []) as SimilarArtistEntry[],
    initialData: [],
    staleTime: Number.POSITIVE_INFINITY,
  })
  return data ?? []
}
