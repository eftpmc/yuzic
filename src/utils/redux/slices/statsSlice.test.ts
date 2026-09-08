import reducer, {
  incrementPlay,
  setServerAlbumStats,
  setServerSongStats,
} from './statsSlice'

const SERVER = 'server-1'
const OTHER = 'server-2'

const empty = () => reducer(undefined, { type: '@@INIT' })

const played = (overrides: Parameters<typeof incrementPlay>[0]) =>
  reducer(empty(), incrementPlay(overrides))

describe('incrementPlay', () => {
  it('counts the song, its album, its artist and its playlist together', () => {
    const state = played({
      serverId: SERVER,
      songId: 's1',
      albumId: 'al1',
      artistId: 'ar1',
      playlistId: 'p1',
    })

    expect(state.songPlays[`${SERVER}:s1`]).toBe(1)
    expect(state.albumPlays[`${SERVER}:al1`]).toBe(1)
    expect(state.artistPlays[`${SERVER}:ar1`]).toBe(1)
    expect(state.playlistPlays[`${SERVER}:p1`]).toBe(1)
  })

  it('keeps one server\'s counts out of another\'s', () => {
    let state = played({ serverId: SERVER, songId: 's1' })
    state = reducer(state, incrementPlay({ serverId: OTHER, songId: 's1' }))

    expect(state.songPlays[`${SERVER}:s1`]).toBe(1)
    expect(state.songPlays[`${OTHER}:s1`]).toBe(1)
  })
})

describe('setServerSongStats', () => {
  it('drops the local tally for a song the server has now counted', () => {
    // The local count is optimistic — the server number already contains that
    // listen, so keeping both would report the play twice.
    const state = reducer(
      played({ serverId: SERVER, songId: 's1' }),
      setServerSongStats({ serverId: SERVER, stats: [{ id: 's1', playCount: 4 }] })
    )

    expect(state.songPlays[`${SERVER}:s1`]).toBeUndefined()
    expect(state.serverSongPlays[`${SERVER}:s1`]).toBe(4)
  })

  it('leaves the local tally alone for a song the server said nothing about', () => {
    // A listen recorded while the server was unreachable, or while server
    // scrobbling is switched off, is the only record of that play. A blanket
    // post-sync clear used to delete it.
    const state = reducer(
      played({ serverId: SERVER, songId: 'offline-play' }),
      setServerSongStats({ serverId: SERVER, stats: [{ id: 's1', playCount: 4 }] })
    )

    expect(state.songPlays[`${SERVER}:offline-play`]).toBe(1)
  })

  it('replaces the server set rather than merging, so a stale count cannot linger', () => {
    let state = reducer(
      empty(),
      setServerSongStats({ serverId: SERVER, stats: [{ id: 'gone', playCount: 9 }] })
    )
    state = reducer(
      state,
      setServerSongStats({ serverId: SERVER, stats: [{ id: 's1', playCount: 1 }] })
    )

    expect(state.serverSongPlays[`${SERVER}:gone`]).toBeUndefined()
    expect(state.serverSongPlays[`${SERVER}:s1`]).toBe(1)
  })

  it('replaces only the syncing server, leaving another server untouched', () => {
    let state = reducer(
      empty(),
      setServerSongStats({ serverId: OTHER, stats: [{ id: 's1', playCount: 7 }] })
    )
    state = reducer(state, setServerSongStats({ serverId: SERVER, stats: [] }))

    expect(state.serverSongPlays[`${OTHER}:s1`]).toBe(7)
  })
})

describe('setServerAlbumStats', () => {
  it('drops the local tally for an album the server has now counted', () => {
    const state = reducer(
      played({ serverId: SERVER, songId: 's1', albumId: 'al1' }),
      setServerAlbumStats({
        serverId: SERVER,
        stats: [{ id: 'al1', playCount: 12, lastPlayedAt: 1_700_000_000_000 }],
      })
    )

    expect(state.albumPlays[`${SERVER}:al1`]).toBeUndefined()
    expect(state.serverAlbumPlays[`${SERVER}:al1`]).toBe(12)
    expect(state.serverAlbumLastPlayedAt[`${SERVER}:al1`]).toBe(1_700_000_000_000)
  })

  it('never touches artist or playlist counts, which no server reports', () => {
    // These have no server number to be reconciled against, so they are the
    // whole record. Clearing them on sync reset every artist and playlist
    // count to zero, forever.
    const state = reducer(
      played({ serverId: SERVER, songId: 's1', albumId: 'al1', artistId: 'ar1', playlistId: 'p1' }),
      setServerAlbumStats({ serverId: SERVER, stats: [{ id: 'al1', playCount: 3, lastPlayedAt: 0 }] })
    )

    expect(state.artistPlays[`${SERVER}:ar1`]).toBe(1)
    expect(state.playlistPlays[`${SERVER}:p1`]).toBe(1)
  })

  it('keeps local last-played, which the server may not know about', () => {
    const state = reducer(
      played({ serverId: SERVER, songId: 's1', albumId: 'al1' }),
      setServerAlbumStats({ serverId: SERVER, stats: [{ id: 'al1', playCount: 3, lastPlayedAt: 0 }] })
    )

    expect(state.albumLastPlayedAt[`${SERVER}:al1`]).toBeGreaterThan(0)
  })
})
