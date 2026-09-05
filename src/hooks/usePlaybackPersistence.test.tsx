import React from 'react'
import { renderHook, act } from '@testing-library/react-native'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'

import { usePlaybackPersistence } from './usePlaybackPersistence'
import playbackReducer from '@/utils/redux/slices/playbackSlice'
import serversReducer, { addServer, setActiveServer } from '@/utils/redux/slices/serversSlice'
import type { Song } from '@/types'

function makeStore(preload?: { activeServerId?: string; persistedServerId?: string | null }) {
  const store = configureStore({
    reducer: combineReducers({
      playback: playbackReducer,
      servers: serversReducer,
    }),
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  })
  if (preload?.activeServerId) {
    store.dispatch(addServer({
      id: preload.activeServerId,
      type: 'navidrome',
      serverUrl: 'https://example.com',
      username: 'u',
      salt: '',
      token: '',
      isAuthenticated: true,
    } as any))
    store.dispatch(setActiveServer(preload.activeServerId))
  }
  if (preload?.persistedServerId !== undefined) {
    // Simulate a persisted queue for a different server.
    store.dispatch({
      type: 'playback/setPlaybackQueue',
      payload: {
        activeServerId: preload.persistedServerId,
        queueSongIds: ['a'],
        currentIndex: 0,
        repeatMode: 'off',
        shuffleMode: 'off',
      },
    })
  }
  return store
}

function wrapperFor(store: ReturnType<typeof makeStore>) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )
  Wrapper.displayName = 'TestStoreWrapper'
  return Wrapper
}

const song = (id: string, contentKind: Song['contentKind'] = 'song'): Song => ({
  id,
  title: id,
  artist: 'A',
  artistId: 'a1',
  cover: { kind: 'none' },
  duration: '120',
  albumId: 'al1',
  streamUrl: `https://example.com/${id}.mp3`,
  contentKind,
})

describe('usePlaybackPersistence', () => {
  it('resets the slice when the active server differs from the persisted one', async () => {
    const store = makeStore({ activeServerId: 'server-B', persistedServerId: 'server-A' })

    await renderHook(() => usePlaybackPersistence(), { wrapper: wrapperFor(store) })

    // The effect fires on mount; the slice should carry server-B and be empty.
    const state = store.getState().playback
    expect(state.activeServerId).toBe('server-B')
    expect(state.queueSongIds).toEqual([])
  })

  it('leaves the slice alone when active and persisted server match', async () => {
    const store = makeStore({ activeServerId: 'server-A', persistedServerId: 'server-A' })

    await renderHook(() => usePlaybackPersistence(), { wrapper: wrapperFor(store) })

    const state = store.getState().playback
    expect(state.queueSongIds).toEqual(['a'])
  })

  it('filters non-song contentKind out of persistQueue', async () => {
    const store = makeStore({ activeServerId: 'server-A' })
    const { result } = await renderHook(() => usePlaybackPersistence(), { wrapper: wrapperFor(store) })

    await act(async () => {
      result.current.persistQueue({
        queue: [
          song('s1'),
          song('radio-1', 'liveStream'),
          song('s2'),
          song('pod-1', 'podcastEpisode'),
        ],
        currentIndex: 3,
        repeatMode: 'off',
        shuffleMode: 'off',
      })
    })

    const state = store.getState().playback
    expect(state.queueSongIds).toEqual(['s1', 's2'])
    // currentIndex clamps to the filtered list length
    expect(state.currentIndex).toBe(1)
  })

  it('throttles persistPosition writes and honors force', async () => {
    const store = makeStore({ activeServerId: 'server-A' })
    const { result } = await renderHook(() => usePlaybackPersistence(), { wrapper: wrapperFor(store) })

    const nowSpy = jest.spyOn(Date, 'now')

    // Ref starts at 0, so the first non-forced write only lands once the
    // clock has advanced past the throttle window. Use a real-scale
    // millisecond value so the assertions read like the runtime behaviour.
    const T0 = 10_000_000
    await act(async () => {
      nowSpy.mockReturnValue(T0)
      result.current.persistPosition(1)
    })
    expect(store.getState().playback.positionMs).toBe(1000)

    // A second call inside the 5s throttle window is dropped.
    await act(async () => {
      nowSpy.mockReturnValue(T0 + 1_000)
      result.current.persistPosition(2)
    })
    expect(store.getState().playback.positionMs).toBe(1000)

    // Force bypasses the throttle regardless of the clock.
    await act(async () => {
      nowSpy.mockReturnValue(T0 + 1_500)
      result.current.persistPosition(3, { force: true })
    })
    expect(store.getState().playback.positionMs).toBe(3000)

    // After the throttle window elapses, non-forced writes apply again.
    await act(async () => {
      nowSpy.mockReturnValue(T0 + 7_000)
      result.current.persistPosition(5)
    })
    expect(store.getState().playback.positionMs).toBe(5000)

    nowSpy.mockRestore()
  })
})
