import {
  enqueueOfflineMutation,
  OfflineMutation,
} from './offlineMutations'

const song = {
  id: 'song-1',
  title: 'Song',
  artist: 'Artist',
  artistId: 'artist-1',
  cover: { kind: 'none' as const },
  duration: '120',
  albumId: 'album-1',
  streamUrl: 'https://example.com/song.mp3',
}

describe('enqueueOfflineMutation', () => {
  it('keeps only the latest favorite operation for a song', () => {
    const first: OfflineMutation = {
      id: '1',
      serverId: 'server',
      type: 'starSong',
      song,
      createdAt: 1,
    }
    const second: OfflineMutation = {
      id: '2',
      serverId: 'server',
      type: 'unstarSong',
      songId: song.id,
      createdAt: 2,
    }

    expect(enqueueOfflineMutation([first], second)).toEqual([second])
  })

  it('keeps only the latest playlist membership operation for a song', () => {
    const first: OfflineMutation = {
      id: '1',
      serverId: 'server',
      type: 'addSongToPlaylist',
      playlistId: 'playlist',
      song,
      createdAt: 1,
    }
    const second: OfflineMutation = {
      id: '2',
      serverId: 'server',
      type: 'removeSongFromPlaylist',
      playlistId: 'playlist',
      songId: song.id,
      createdAt: 2,
    }

    expect(enqueueOfflineMutation([first], second)).toEqual([second])
  })

  it('does not coalesce operations for different servers', () => {
    const first: OfflineMutation = {
      id: '1',
      serverId: 'server-a',
      type: 'unstarSong',
      songId: song.id,
      createdAt: 1,
    }
    const second: OfflineMutation = {
      id: '2',
      serverId: 'server-b',
      type: 'starSong',
      song,
      createdAt: 2,
    }

    expect(enqueueOfflineMutation([first], second)).toEqual([first, second])
  })
})
