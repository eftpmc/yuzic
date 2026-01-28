import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QueryKeys } from '@/enums/queryKeys'
import {
  clearExploreQueries,
  getExploreMeta,
  setExploreMeta,
  type ExploreMeta,
} from '../exploreCache'

const defaultMeta: ExploreMeta = {
  hasInitialFill: false,
  hasNewData: false,
  processedArtistIds: [],
  serverArtistMbidMap: {},
  lastSyncError: null,
}

export function useExploreMeta(): ExploreMeta {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: [QueryKeys.ExploreMeta],
    queryFn: () => getExploreMeta(queryClient),
    initialData: defaultMeta,
    staleTime: Number.POSITIVE_INFINITY,
  })
  return data ?? defaultMeta
}

export function useClearExploreNewData(): () => void {
  const queryClient = useQueryClient()
  return useCallback(() => {
    setExploreMeta(queryClient, (m) => ({ ...m, hasNewData: false }))
  }, [queryClient])
}

/** Clears explore cache so sync will run again on Home. Use for "Try again" on error. */
export function useRetryExploreSync(): () => void {
  const queryClient = useQueryClient()
  return useCallback(() => {
    clearExploreQueries(queryClient)
  }, [queryClient])
}
