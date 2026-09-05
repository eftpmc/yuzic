import React from 'react'
import { act, renderHook } from '@testing-library/react-native'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'

import settingsReducer, {
  setLastfmEnabled,
  setListenbrainzDiscoveryEnabled,
  setMusicbrainzExternalEnabled,
} from '@/utils/redux/slices/settingsSlice'

/**
 * A stand-in for react-query that does the one thing under test: run the
 * query function when `enabled` says so, and not otherwise. The real client
 * is deliberately not mounted here — rendering one in this jest environment
 * leaves the worker alive after the run — and what these tests are about is
 * the flag we hand it, not what it does with it.
 */
jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: { enabled?: boolean; queryFn: () => unknown }) => {
    const enabled = options.enabled !== false
    if (enabled) void options.queryFn()
    return { data: undefined, isLoading: enabled }
  },
}))

jest.mock('@/api/musicbrainz', () => ({
  searchArtist: jest.fn(async () => [{ id: 'mbid-1', name: 'Boards of Canada' }]),
}))
jest.mock('@/api/listenbrainz', () => ({
  getLBSimilarArtists: jest.fn(async () => [{ artistMbid: 'mbid-2', name: 'Bibio' }]),
}))
jest.mock('@/api/lastfm/getSimilarArtists', () => ({
  getLastFmSimilarArtists: jest.fn(async () => [{ name: 'Bibio', mbid: 'mbid-2' }]),
}))
jest.mock('@/constants/keys', () => ({ LASTFM_API_KEY: 'test-key' }))

import { searchArtist } from '@/api/musicbrainz'
import { getLBSimilarArtists } from '@/api/listenbrainz'
import { getLastFmSimilarArtists } from '@/api/lastfm/getSimilarArtists'
import { useArtistMbid } from './useArtistMbid'
import { useLBSimilarArtists } from './useLBSimilarArtists'
import { useSimilarArtists } from './useSimilarArtists'

function makeStore() {
  return configureStore({
    reducer: combineReducers({ settings: settingsReducer }),
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  })
}

function wrapperFor(store: ReturnType<typeof makeStore>) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )
  Wrapper.displayName = 'TestStoreWrapper'
  return Wrapper
}

/**
 * Each of these hooks reaches a different third party, and each has its own
 * switch in Settings. All three default to off, so someone who has connected
 * nothing but their own server sends nothing to any of them.
 */
describe('external metadata gating', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('does not ask MusicBrainz for an mbid until MusicBrainz is enabled', async () => {
    const store = makeStore()

    const { result } = await renderHook(
      () => useArtistMbid('Boards of Canada', null),
      { wrapper: wrapperFor(store) }
    )
    expect(searchArtist).not.toHaveBeenCalled()
    expect(result.current.mbid).toBeNull()
    // And nothing to show for it: a shelf that needs the id hides itself
    // rather than sitting on a spinner that will never resolve.
    expect(result.current.isResolving).toBe(false)

    await act(async () => { store.dispatch(setMusicbrainzExternalEnabled(true)) })
    await renderHook(
      () => useArtistMbid('Boards of Canada', null),
      { wrapper: wrapperFor(store) }
    )

    expect(searchArtist).toHaveBeenCalledWith('Boards of Canada', 1)
  })

  it('still uses an mbid the server already carries with MusicBrainz off', async () => {
    const store = makeStore()

    const { result } = await renderHook(
      () => useArtistMbid('Boards of Canada', 'mbid-local'),
      { wrapper: wrapperFor(store) }
    )

    expect(result.current.mbid).toBe('mbid-local')
    expect(searchArtist).not.toHaveBeenCalled()
  })

  it('does not call ListenBrainz until discovery is enabled', async () => {
    const store = makeStore()

    await renderHook(
      () => useLBSimilarArtists({ mbid: 'mbid-1', excludeName: 'Boards of Canada' }, 8),
      { wrapper: wrapperFor(store) }
    )
    expect(getLBSimilarArtists).not.toHaveBeenCalled()

    await act(async () => { store.dispatch(setListenbrainzDiscoveryEnabled(true)) })
    await renderHook(
      () => useLBSimilarArtists({ mbid: 'mbid-1', excludeName: 'Boards of Canada' }, 8),
      { wrapper: wrapperFor(store) }
    )

    expect(getLBSimilarArtists).toHaveBeenCalledWith('mbid-1', 8)
  })

  it('does not call Last.fm until Last.fm is enabled', async () => {
    const store = makeStore()

    await renderHook(
      () => useSimilarArtists({ name: 'Boards of Canada', limit: 8 }),
      { wrapper: wrapperFor(store) }
    )
    expect(getLastFmSimilarArtists).not.toHaveBeenCalled()

    await act(async () => { store.dispatch(setLastfmEnabled(true)) })
    await renderHook(
      () => useSimilarArtists({ name: 'Boards of Canada', limit: 8 }),
      { wrapper: wrapperFor(store) }
    )

    expect(getLastFmSimilarArtists).toHaveBeenCalled()
  })
})
