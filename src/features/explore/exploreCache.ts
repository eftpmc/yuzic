import type { QueryClient } from '@tanstack/react-query'
import { QueryKeys } from '@/enums/queryKeys'
import type { ExternalArtistBase, ExternalAlbumBase } from '@/types'

export type SimilarArtistEntry = {
  artist: ExternalArtistBase
  albums: ExternalAlbumBase[]
}

export type ExploreMeta = {
  hasInitialFill: boolean
  hasNewData: boolean
  processedArtistIds: string[]
  serverArtistMbidMap: Record<string, string>
  /** Set when sync or explorer hit errors; cleared on successful sync. */
  lastSyncError: string | null
}

const defaultMeta: ExploreMeta = {
  hasInitialFill: false,
  hasNewData: false,
  processedArtistIds: [],
  serverArtistMbidMap: {},
  lastSyncError: null,
}

export function getExploreArtists(
  queryClient: QueryClient
): SimilarArtistEntry[] {
  return (
    queryClient.getQueryData<SimilarArtistEntry[]>([QueryKeys.ExploreArtists]) ??
    []
  )
}

export function setExploreArtists(
  queryClient: QueryClient,
  updater: (prev: SimilarArtistEntry[]) => SimilarArtistEntry[]
): void {
  queryClient.setQueryData<SimilarArtistEntry[]>(
    [QueryKeys.ExploreArtists],
    updater(getExploreArtists(queryClient))
  )
}

export function getExploreMeta(queryClient: QueryClient): ExploreMeta {
  return (
    queryClient.getQueryData<ExploreMeta>([QueryKeys.ExploreMeta]) ?? defaultMeta
  )
}

export function setExploreMeta(
  queryClient: QueryClient,
  updater: (prev: ExploreMeta) => ExploreMeta
): void {
  queryClient.setQueryData<ExploreMeta>(
    [QueryKeys.ExploreMeta],
    updater(getExploreMeta(queryClient))
  )
}

export const EXPLORE_QUERY_KEYS = [
  [QueryKeys.ExploreArtists],
  [QueryKeys.ExploreMeta],
] as const

export function clearExploreQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: [QueryKeys.ExploreArtists] })
  queryClient.removeQueries({ queryKey: [QueryKeys.ExploreMeta] })
}
