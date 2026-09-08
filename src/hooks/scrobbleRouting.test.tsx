import React from 'react'
import { act, renderHook } from '@testing-library/react-native'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'

import type { Server, Song } from '@/types'
import settingsReducer from '@/utils/redux/slices/settingsSlice'
import serversReducer, { addServer, setActiveServer } from '@/utils/redux/slices/serversSlice'
import listenbrainzReducer from '@/utils/redux/slices/listenbrainzSlice'
import statsReducer from '@/utils/redux/slices/statsSlice'
import offlineMutationsReducer from '@/utils/redux/slices/offlineMutationsSlice'

const mockSongsApi = {
  get: jest.fn(),
  scrobble: jest.fn(async () => {}),
  reportNowPlaying: jest.fn(async () => {}),
  reportPlaybackStart: jest.fn(async () => {}),
  reportPlaybackProgress: jest.fn(async () => {}),
  reportPlaybackStop: jest.fn(async () => {}),
  buildStreamUrl: jest.fn(() => ''),
  streamableCodecs: ['mp3'] as const,
  scrobbleKind: 'scrobble' as const,
}

jest.mock('@/api', () => ({ useApi: () => ({ songs: mockSongsApi }) }))
// Not under test, and its transitive expo-constants import doesn't transform
// in this environment. ListenBrainz is a separate destination with its own
// switch — see the note on queueScrobble.
jest.mock('@/api/listenbrainz', () => ({
  submitScrobble: jest.fn(async () => {}),
  submitNowPlaying: jest.fn(async () => {}),
}))

import { useScrobbling } from './useScrobbling'

function serverOf(type: Server['type']): Server {
  return {
    id: `${type}-1`,
    type,
    serverUrl: 'https://media.example',
    username: 'ari',
    auth: type === 'navidrome' ? { password: 'pw' } : { token: 'tok', userId: 'u1' },
    isAuthenticated: true,
  }
}

function makeStore(server: Server) {
  const store = configureStore({
    reducer: combineReducers({
      settings: settingsReducer,
      servers: serversReducer,
      listenbrainz: listenbrainzReducer,
      stats: statsReducer,
      offlineMutations: offlineMutationsReducer,
    }),
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  })
  store.dispatch(addServer(server))
  store.dispatch(setActiveServer(server.id))
  return store
}

function wrapperFor(store: ReturnType<typeof makeStore>) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )
  Wrapper.displayName = 'TestStoreWrapper'
  return Wrapper
}

const song: Song = {
  id: 's1',
  title: 'Roygbiv',
  artist: 'Boards of Canada',
  artistId: 'a1',
  albumId: 'al1',
  duration: '200',
  streamUrl: 'https://media.example/stream/s1',
  cover: { kind: 'none' },
}

/**
 * Scrobbling used to branch on `activeServer.type` and, for Navidrome, call
 * the Subsonic endpoint directly with raw credentials instead of going through
 * the adapter. That copy was built without a serverId, so it never got URL
 * failover: away from home, on a fallback address, every scrobble was aimed at
 * the unreachable primary. These pin the routing to the adapter for every
 * provider.
 */
describe('scrobble routing', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it.each(['navidrome', 'jellyfin', 'emby'] as const)(
    'records a finished listen through the adapter on %s',
    async (type) => {
      const store = makeStore(serverOf(type))
      const { result } = await renderHook(() => useScrobbling(), { wrapper: wrapperFor(store) })

      await act(async () => {
        await result.current.scrobbleIfNeeded(song, { listenedSeconds: 180, startTime: 1_700_000_000 })
      })

      expect(mockSongsApi.scrobble).toHaveBeenCalledWith('s1', 1_700_000_000)
    }
  )

  it.each(['navidrome', 'jellyfin', 'emby'] as const)(
    'announces now-playing through the adapter on %s',
    async (type) => {
      const store = makeStore(serverOf(type))
      const { result } = await renderHook(() => useScrobbling(), { wrapper: wrapperFor(store) })

      await act(async () => { result.current.submitNowPlaying(song) })

      expect(mockSongsApi.reportNowPlaying).toHaveBeenCalledWith('s1')
    }
  )

  it('leaves a listen too short to count alone', async () => {
    const store = makeStore(serverOf('navidrome'))
    const { result } = await renderHook(() => useScrobbling(), { wrapper: wrapperFor(store) })

    await act(async () => {
      await result.current.scrobbleIfNeeded(song, { listenedSeconds: 5, startTime: 1_700_000_000 })
    })

    expect(mockSongsApi.scrobble).not.toHaveBeenCalled()
  })

  it('parks a failed scrobble in the offline queue rather than dropping it', async () => {
    mockSongsApi.scrobble.mockRejectedValueOnce(new Error('unreachable'))
    const store = makeStore(serverOf('navidrome'))
    const { result } = await renderHook(() => useScrobbling(), { wrapper: wrapperFor(store) })

    await act(async () => {
      await result.current.scrobbleIfNeeded(song, { listenedSeconds: 180, startTime: 1_700_000_000 })
    })

    const queued = store.getState().offlineMutations.queue
    expect(queued).toHaveLength(1)
    expect(queued[0]).toMatchObject({ type: 'scrobble', songId: 's1', destination: 'server' })
  })
})
