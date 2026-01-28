import type { QueryClient } from '@tanstack/react-query'
import store from '@/utils/redux/store'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import { similarArtistsExplorer } from './similarArtistsExplorer'
import { getExploreMeta, setExploreMeta } from './exploreCache'
import type { ApiAdapter } from '@/api/types'
import { EXPLORE_LIMITS } from './exploreLimits'

let syncInProgress = false

/**
 * Fetches library artists from the API, diffs against already-processed items,
 * and queues new ones for similar-artist discovery. Updates React Query explore
 * cache. No-ops if not authenticated or sync already running.
 */
export async function runExploreSync(
  queryClient: QueryClient,
  api: ApiAdapter
): Promise<void> {
  if (syncInProgress) return
  const state = store.getState()
  const activeServer = selectActiveServer(state)
  if (!activeServer?.isAuthenticated) return

  const meta = getExploreMeta(queryClient)
  if (meta.hasInitialFill) return

  syncInProgress = true
  try {
    await doSync(queryClient, api)
  } finally {
    syncInProgress = false
  }
}

const SYNC_ERROR_MSG = 'Some recommendations could not be loaded.'
const SYNC_FAIL_MSG = 'Recommendations failed to load.'

async function doSync(
  queryClient: QueryClient,
  api: ApiAdapter
): Promise<void> {
  const artists = await api.artists.list().catch(() => [])

  const meta = getExploreMeta(queryClient)
  const processedArtistIds = new Set(meta.processedArtistIds)

  const toFetchArtists = artists
    .filter((a) => !processedArtistIds.has(a.id))
    .slice(0, EXPLORE_LIMITS.artistsPerSync)

  let consumedArtistIds: string[] = []
  let hadErrors = false
  let syncThrew = false

  if (toFetchArtists.length > 0) {
    try {
      const result = await similarArtistsExplorer.request(
        queryClient,
        toFetchArtists.map((a) => ({ id: a.id, name: a.name })),
        EXPLORE_LIMITS.artists
      )
      consumedArtistIds = result.consumedArtistIds
      hadErrors = result.hadErrors
    } catch {
      syncThrew = true
    }
  }

  setExploreMeta(queryClient, (m) => {
    const next = {
      ...m,
      hasInitialFill: true,
      lastSyncError: syncThrew
        ? SYNC_FAIL_MSG
        : hadErrors
          ? SYNC_ERROR_MSG
          : null,
    }
    if (consumedArtistIds.length) {
      const set = new Set(m.processedArtistIds)
      consumedArtistIds.forEach((id) => set.add(id))
      next.processedArtistIds = [...set]
    }
    return next
  })
}
