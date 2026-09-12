import React from 'react'
import { act, renderHook } from '@testing-library/react-native'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'

import settingsReducer, {
  setMetadataArtworkSourceEnabled,
} from '@/utils/redux/slices/settingsSlice'
import { useArtworkEnrichment } from './useArtworkEnrichment'

/**
 * Same stand-in for react-query used by useArtistInfoEnrichment's own tests
 * (see hooks/artists/externalGating.test.tsx): runs the query function when
 * `enabled` says so and returns its resolved value synchronously, so the
 * hook's own gaps-only branch is what's under test rather than react-query.
 */
let mockLastResolved: unknown
jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: { enabled?: boolean; queryFn: () => Promise<unknown> }) => {
    const enabled = options.enabled !== false
    if (enabled) {
      options.queryFn().then((value: unknown) => { mockLastResolved = value })
    }
    return { data: enabled ? mockLastResolved : undefined, isLoading: false }
  },
}))

const mockResolveArtwork = jest.fn()
jest.mock('@/features/metadata/resolveArtwork', () => ({
  resolveArtwork: (...args: unknown[]) => mockResolveArtwork(...args),
}))

jest.mock('@/features/metadata/enrichmentFetchers', () => ({
  metadataArtworkFetchers: { deezer: jest.fn(), coverartarchive: jest.fn() },
}))

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

describe('useArtworkEnrichment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLastResolved = undefined
  })

  it('does not call resolveArtwork when the server already has artwork (gaps only)', async () => {
    const store = makeStore()
    await act(async () => { store.dispatch(setMetadataArtworkSourceEnabled({ sourceId: 'deezer', enabled: true })) })

    const { result } = await renderHook(
      () => useArtworkEnrichment({ name: 'Radiohead', mbid: null, hasOwnArtwork: true }),
      { wrapper: wrapperFor(store) }
    )

    expect(mockResolveArtwork).not.toHaveBeenCalled()
    expect(result.current.cover).toBeNull()
    expect(result.current.sourceLabel).toBeNull()
  })

  it('does not call resolveArtwork when no artwork source is enabled', async () => {
    const store = makeStore()

    const { result } = await renderHook(
      () => useArtworkEnrichment({ name: 'Radiohead', mbid: null, hasOwnArtwork: false }),
      { wrapper: wrapperFor(store) }
    )

    expect(mockResolveArtwork).not.toHaveBeenCalled()
    expect(result.current.cover).toBeNull()
    expect(result.current.sourceLabel).toBeNull()
  })

  it('returns the enriched cover only when the server has a gap and a source is enabled', async () => {
    const store = makeStore()
    await act(async () => { store.dispatch(setMetadataArtworkSourceEnabled({ sourceId: 'deezer', enabled: true })) })
    mockResolveArtwork.mockResolvedValue({
      cover: { kind: 'url', url: 'https://example.com/a.jpg' },
      source: 'deezer',
    })

    const { result, rerender } = await renderHook(
      () => useArtworkEnrichment({ name: 'Radiohead', mbid: null, hasOwnArtwork: false }),
      { wrapper: wrapperFor(store) }
    )

    expect(mockResolveArtwork).toHaveBeenCalledWith({
      entity: { name: 'Radiohead', mbid: null, mbidType: undefined },
      enabledSourcesInOrder: ['deezer'],
      fetchers: expect.anything(),
    })

    await act(async () => {
      await Promise.resolve()
      rerender({})
    })

    expect(result.current.cover).toEqual({ kind: 'url', url: 'https://example.com/a.jpg' })
    expect(result.current.sourceLabel).toBe('Deezer')
  })

  it('restores the server view (nothing) the instant every source is disabled', async () => {
    const store = makeStore()
    await act(async () => { store.dispatch(setMetadataArtworkSourceEnabled({ sourceId: 'deezer', enabled: true })) })
    mockResolveArtwork.mockResolvedValue({
      cover: { kind: 'url', url: 'https://example.com/a.jpg' },
      source: 'deezer',
    })

    await act(async () => { store.dispatch(setMetadataArtworkSourceEnabled({ sourceId: 'deezer', enabled: false })) })

    const { result } = await renderHook(
      () => useArtworkEnrichment({ name: 'Radiohead', mbid: null, hasOwnArtwork: false }),
      { wrapper: wrapperFor(store) }
    )

    expect(mockResolveArtwork).not.toHaveBeenCalled()
    expect(result.current.cover).toBeNull()
    expect(result.current.sourceLabel).toBeNull()
  })

  it('never writes anything — display-only, no dispatch, no server call inside the hook', async () => {
    const store = makeStore()
    const dispatchSpy = jest.spyOn(store, 'dispatch')
    await act(async () => { store.dispatch(setMetadataArtworkSourceEnabled({ sourceId: 'deezer', enabled: true })) })
    dispatchSpy.mockClear()
    mockResolveArtwork.mockResolvedValue(null)

    await renderHook(
      () => useArtworkEnrichment({ name: 'Radiohead', mbid: null, hasOwnArtwork: false }),
      { wrapper: wrapperFor(store) }
    )

    expect(dispatchSpy).not.toHaveBeenCalled()
  })
})
