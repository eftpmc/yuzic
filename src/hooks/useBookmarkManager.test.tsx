import React from 'react'
import { renderHook, act } from '@testing-library/react-native'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'

import playbackReducer from '@/utils/redux/slices/playbackSlice'
import serversReducer, { addServer, setActiveServer } from '@/utils/redux/slices/serversSlice'
import settingsReducer, { setResumeLongTracksEnabled } from '@/utils/redux/slices/settingsSlice'
import type { Song } from '@/types'

// Mocked api adapter — supplies (or withholds) api.bookmarks depending on
// what the test needs. `useApi` is imported by useBookmarkManager. Variables
// referenced from inside jest.mock() are prefixed with `mock` per the
// Jest hoisting rules.
const mockList = jest.fn<Promise<Array<{ songId: string; positionMs: number }>>, []>()
const mockCreate = jest.fn<Promise<void>, [{ songId: string; positionMs: number }]>()
const mockRemove = jest.fn<Promise<void>, [string]>()
const mockBookmarksSupported = { current: true }

jest.mock('@/api', () => ({
  useApi: () => ({
    bookmarks: mockBookmarksSupported.current
      ? { list: mockList, create: mockCreate, remove: mockRemove }
      : undefined,
  }),
}))

import { useBookmarkManager } from './useBookmarkManager'

function makeStore(opts?: { resumeEnabled?: boolean; serverId?: string; seededBookmark?: { songId: string; positionMs: number } }) {
  const store = configureStore({
    reducer: combineReducers({
      playback: playbackReducer,
      servers: serversReducer,
      settings: settingsReducer,
    }),
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  })
  if (opts?.serverId) {
    store.dispatch(addServer({
      id: opts.serverId,
      type: 'navidrome',
      serverUrl: 'https://example.com',
      username: 'u',
      salt: '',
      token: '',
      isAuthenticated: true,
    } as any))
    store.dispatch(setActiveServer(opts.serverId))
  }
  if (opts?.resumeEnabled === false) {
    store.dispatch(setResumeLongTracksEnabled(false))
  }
  if (opts?.seededBookmark) {
    store.dispatch({
      type: 'playback/setPlaybackBookmark',
      payload: { songId: opts.seededBookmark.songId, positionMs: opts.seededBookmark.positionMs },
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

const longAudiobook = (id = 'ab'): Song => ({
  id,
  title: 'Long audiobook',
  artist: 'Author',
  artistId: 'a1',
  cover: { kind: 'none' },
  duration: String(60 * 60), // 60 minutes — over the 20-min bookmark cutoff
  albumId: 'ab-album',
  streamUrl: 'https://example.com/ab.mp3',
})

const shortSong = (id = 's'): Song => ({
  id,
  title: 'Short song',
  artist: 'A',
  artistId: 'a1',
  cover: { kind: 'none' },
  duration: '180', // 3 minutes — under the cutoff, not bookmarkable
  albumId: 'al1',
  streamUrl: 'https://example.com/s.mp3',
})

beforeEach(() => {
  mockList.mockReset()
  mockCreate.mockReset()
  mockRemove.mockReset()
  mockBookmarksSupported.current = true
  mockList.mockResolvedValue([])
  mockCreate.mockResolvedValue(undefined)
  mockRemove.mockResolvedValue(undefined)
})

describe('useBookmarkManager', () => {
  it('reports getResumePosition in seconds and returns null for unknown tracks', async () => {
    const store = makeStore({
      serverId: 'server-A',
      seededBookmark: { songId: 'ab', positionMs: 900_000 }, // 15 minutes
    })
    const { result } = await renderHook(() => useBookmarkManager(), { wrapper: wrapperFor(store) })

    expect(result.current.getResumePosition('ab')).toBe(900)
    expect(result.current.getResumePosition('nope')).toBeNull()
  })

  it('returns null from getResumePosition when the resume toggle is off', async () => {
    const store = makeStore({
      serverId: 'server-A',
      resumeEnabled: false,
      seededBookmark: { songId: 'ab', positionMs: 900_000 },
    })
    const { result } = await renderHook(() => useBookmarkManager(), { wrapper: wrapperFor(store) })

    expect(result.current.getResumePosition('ab')).toBeNull()
  })

  it('saves a bookmark and mirrors to the server for a long track mid-play', async () => {
    const store = makeStore({ serverId: 'server-A' })
    const { result } = await renderHook(() => useBookmarkManager(), { wrapper: wrapperFor(store) })

    await act(async () => {
      await result.current.saveOrClear(longAudiobook('ab'), 900) // 15m in a 60m track
    })

    expect(store.getState().playback.bookmarks.ab?.positionMs).toBe(900_000)
    expect(mockCreate).toHaveBeenCalledWith({ songId: 'ab', positionMs: 900_000 })
  })

  it('does not save a bookmark for a short track', async () => {
    const store = makeStore({ serverId: 'server-A' })
    const { result } = await renderHook(() => useBookmarkManager(), { wrapper: wrapperFor(store) })

    await act(async () => {
      await result.current.saveOrClear(shortSong('s'), 60)
    })

    expect(store.getState().playback.bookmarks.s).toBeUndefined()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('clears the bookmark past the near-end cutoff', async () => {
    const store = makeStore({
      serverId: 'server-A',
      seededBookmark: { songId: 'ab', positionMs: 900_000 },
    })
    const { result } = await renderHook(() => useBookmarkManager(), { wrapper: wrapperFor(store) })

    // 3540s / 3600s = 98.3% — over the 97% cutoff
    await act(async () => {
      await result.current.saveOrClear(longAudiobook('ab'), 3540)
    })

    expect(store.getState().playback.bookmarks.ab).toBeUndefined()
    expect(mockRemove).toHaveBeenCalledWith('ab')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('does nothing when the resume toggle is off, even for a bookmarkable track', async () => {
    const store = makeStore({ serverId: 'server-A', resumeEnabled: false })
    const { result } = await renderHook(() => useBookmarkManager(), { wrapper: wrapperFor(store) })

    await act(async () => {
      await result.current.saveOrClear(longAudiobook('ab'), 900)
    })

    expect(store.getState().playback.bookmarks.ab).toBeUndefined()
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockList).not.toHaveBeenCalled()
  })

  it('does not touch the server when api.bookmarks is absent', async () => {
    mockBookmarksSupported.current = false
    const store = makeStore({ serverId: 'server-A' })
    const { result } = await renderHook(() => useBookmarkManager(), { wrapper: wrapperFor(store) })

    await act(async () => {
      await result.current.saveOrClear(longAudiobook('ab'), 900)
    })

    expect(store.getState().playback.bookmarks.ab?.positionMs).toBe(900_000)
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockList).not.toHaveBeenCalled()
  })
})
