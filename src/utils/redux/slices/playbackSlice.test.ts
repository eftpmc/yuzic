import reducer, {
  setPlaybackQueue,
  setPlaybackCurrentIndex,
  setPlaybackPosition,
  setPlaybackBookmark,
  seedPlaybackBookmarks,
  resetPlaybackForServer,
} from './playbackSlice'

describe('playbackSlice', () => {
  it('stamps activeServerId and resets position on setPlaybackQueue', () => {
    const next = reducer(undefined, setPlaybackQueue({
      activeServerId: 'server-A',
      queueSongIds: ['a', 'b', 'c'],
      currentIndex: 1,
      repeatMode: 'off',
      shuffleMode: 'off',
    }))
    expect(next.activeServerId).toBe('server-A')
    expect(next.queueSongIds).toEqual(['a', 'b', 'c'])
    expect(next.currentIndex).toBe(1)
    expect(next.positionMs).toBe(0)
  })

  it('moves the pointer without touching the queue on setPlaybackCurrentIndex', () => {
    const seeded = reducer(undefined, setPlaybackQueue({
      activeServerId: 'server-A',
      queueSongIds: ['a', 'b', 'c'],
      currentIndex: 0,
      repeatMode: 'off',
      shuffleMode: 'off',
    }))
    // Simulate an interim position tick so the reset-on-track-change is visible.
    const withPosition = reducer(seeded, setPlaybackPosition({ positionMs: 30_000 }))
    const advanced = reducer(withPosition, setPlaybackCurrentIndex({ currentIndex: 2 }))
    expect(advanced.currentIndex).toBe(2)
    expect(advanced.queueSongIds).toEqual(['a', 'b', 'c'])
    expect(advanced.positionMs).toBe(0)
  })

  it('setPlaybackBookmark with a null or 0 position clears the entry', () => {
    const stored = reducer(undefined, setPlaybackBookmark({ songId: 's1', positionMs: 45_000 }))
    expect(stored.bookmarks.s1?.positionMs).toBe(45_000)

    const clearedNull = reducer(stored, setPlaybackBookmark({ songId: 's1', positionMs: null }))
    expect(clearedNull.bookmarks.s1).toBeUndefined()

    const clearedZero = reducer(stored, setPlaybackBookmark({ songId: 's1', positionMs: 0 }))
    expect(clearedZero.bookmarks.s1).toBeUndefined()
  })

  it('seedPlaybackBookmarks skips entries the local map has written recently', () => {
    // Local write, freshly stamped.
    const local = reducer(undefined, setPlaybackBookmark({ songId: 's1', positionMs: 60_000 }))
    // Server seed says s1 has an older position — must be ignored, local wins.
    const merged = reducer(local, seedPlaybackBookmarks({ s1: 10_000, s2: 20_000 }))
    expect(merged.bookmarks.s1?.positionMs).toBe(60_000)
    expect(merged.bookmarks.s2?.positionMs).toBe(20_000)
  })

  it('resetPlaybackForServer wipes queue and bookmarks and stamps the new server id', () => {
    const seeded = reducer(undefined, setPlaybackQueue({
      activeServerId: 'old-server',
      queueSongIds: ['a', 'b'],
      currentIndex: 1,
      repeatMode: 'all',
      shuffleMode: 'on',
    }))
    const withBookmark = reducer(seeded, setPlaybackBookmark({ songId: 's1', positionMs: 42_000 }))

    const reset = reducer(withBookmark, resetPlaybackForServer({ activeServerId: 'new-server' }))
    expect(reset.activeServerId).toBe('new-server')
    expect(reset.queueSongIds).toEqual([])
    expect(reset.currentIndex).toBe(0)
    expect(reset.positionMs).toBe(0)
    expect(reset.repeatMode).toBe('off')
    expect(reset.shuffleMode).toBe('off')
    expect(reset.bookmarks).toEqual({})
  })
})
