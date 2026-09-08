import libraryPlaylistsReducer, {
  addLibraryPlaylistSong,
  removeLibraryPlaylistSong,
  setLibraryPlaylists,
} from './libraryPlaylistsSlice'
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
  it('optimistically adds and removes playlist songs', () => {
    const initial = libraryPlaylistsReducer(undefined, setLibraryPlaylists([playlist]))

    const added = libraryPlaylistsReducer(
      initial,
      addLibraryPlaylistSong({ playlistId: playlist.id, song })
    )
    expect(new Date(added.playlists[0].changed).getTime()).toBeGreaterThan(0)

    const removed = libraryPlaylistsReducer(
      added,
      removeLibraryPlaylistSong({ playlistId: playlist.id, songId: song.id })
    )
    expect(new Date(removed.playlists[0].changed).getTime()).toBeGreaterThan(0)
  })
})
