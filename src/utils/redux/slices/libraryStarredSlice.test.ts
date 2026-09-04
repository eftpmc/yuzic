import libraryStarredReducer, {
  addLibraryStarredSong,
  clearLibraryStarred,
  removeLibraryStarredSong,
  setLibraryStarredAlbums,
} from './libraryStarredSlice'
import { AlbumBase, Song } from '@/types'

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

const album: AlbumBase = {
  id: 'album-1',
  title: 'Album',
  cover: { kind: 'none' },
  subtext: '',
  artist: { id: 'artist-1', name: 'Artist', cover: { kind: 'none' }, subtext: '' },
  year: 2020,
  genres: [],
  created: new Date(0),
}

describe('libraryStarred offline reducers', () => {
  it('optimistically adds and removes starred songs', () => {
    const added = libraryStarredReducer(undefined, addLibraryStarredSong(song))
    expect(added.starred.map(item => item.id)).toEqual([song.id])

    const removed = libraryStarredReducer(added, removeLibraryStarredSong(song.id))
    expect(removed.starred).toEqual([])
  })

  it('sets starred albums and clears them on clearLibraryStarred', () => {
    const withAlbums = libraryStarredReducer(undefined, setLibraryStarredAlbums([album]))
    expect(withAlbums.starredAlbums.map(item => item.id)).toEqual([album.id])

    const cleared = libraryStarredReducer(withAlbums, clearLibraryStarred())
    expect(cleared.starredAlbums).toEqual([])
  })
})
