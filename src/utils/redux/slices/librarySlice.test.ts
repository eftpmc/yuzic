import libraryReducer, {
  addLibraryPlaylistSong,
  addLibraryStarredSong,
  removeLibraryPlaylistSong,
  removeLibraryStarredSong,
} from './librarySlice'
import { PlaylistBase, Song } from '@/types'

const song: Song = {
  id: 'song-1',
  title: 'Song',
  artist: 'Artist',
  artistId: 'artist-1',
  cover: { kind: 'none' },
  duration: '120',
  albumId: 'album-1',
  streamUrl: 'https://example.com/song.mp3',
}

const playlist: PlaylistBase = {
  id: 'playlist-1',
  title: 'Playlist',
  subtext: '',
  cover: { kind: 'none' },
  changed: new Date(0),
  created: new Date(0),
}

describe('library offline reducers', () => {
  it('optimistically adds and removes starred songs', () => {
    const added = libraryReducer(undefined, addLibraryStarredSong(song))
    expect(added.starred.map(item => item.id)).toEqual([song.id])

    const removed = libraryReducer(added, removeLibraryStarredSong(song.id))
    expect(removed.starred).toEqual([])
  })

  it('optimistically adds and removes playlist songs', () => {
    const initial = libraryReducer(undefined, {
      type: 'library/setLibraryPlaylists',
      payload: [playlist],
    })

    const added = libraryReducer(
      initial,
      addLibraryPlaylistSong({ playlistId: playlist.id, song })
    )
    expect(new Date(added.playlists[0].changed).getTime()).toBeGreaterThan(0)

    const removed = libraryReducer(
      added,
      removeLibraryPlaylistSong({ playlistId: playlist.id, songId: song.id })
    )
    expect(new Date(removed.playlists[0].changed).getTime()).toBeGreaterThan(0)
  })
})
