import type { ApiAdapter, AlbumsApi, ArtistsApi, AuthApi, GenresApi, LyricsApi, PlaylistsApi, SearchApi, SimilarApi, SongsApi, StarredApi, TracksApi } from '@/api/types';
import type { Album, AlbumBase, Artist, Playlist, PlaylistBase, Server, Song } from '@/types';
import { addLocalPlaylist, readLocalLibrary, removeLocalPlaylist, setLocalStarred, updateLocalPlaylist } from './store';

const none = { kind: 'none' as const };

function trackMap(): Map<string, Song> { return new Map(readLocalLibrary().tracks.map(track => [track.id, track])); }
function albums(): AlbumBase[] {
  const groups = new Map<string, Song[]>();
  for (const track of readLocalLibrary().tracks) groups.set(track.albumId, [...(groups.get(track.albumId) ?? []), track]);
  return [...groups.entries()].map(([id, tracks]) => {
    const first = tracks[0];
    return { id, title: first.albumTitle ?? 'Unknown Album', cover: first.cover, subtext: `Album • ${first.artist}`, artist: { id: first.artistId, name: first.artist, cover: none, subtext: 'Artist' }, year: first.year ?? 0, genres: [], created: new Date(first.dateAdded ?? 0) };
  });
}
function artists(): Artist[] {
  const groups = new Map<string, Song[]>();
  for (const track of readLocalLibrary().tracks) groups.set(track.artistId, [...(groups.get(track.artistId) ?? []), track]);
  return [...groups.entries()].map(([id, tracks]) => ({ id, name: tracks[0].artist, cover: none, subtext: 'Artist', albumIds: [...new Set(tracks.map(track => track.albumId))] }));
}

/** Local files deliberately use the same ApiAdapter as a server. That keeps all
 * catalog and player consumers on one capability-driven path; only transport
 * differences live here, where streams are ordinary private file URIs. */
export function createLocalAdapter(_server: Server): ApiAdapter {
  const auth: AuthApi = {
    connect: async () => ({ success: true }), ping: async () => true, testUrl: async () => ({ success: true }),
    startScan: async () => ({ success: true }), disconnect: () => {},
  };
  const tracks: TracksApi = { list: async () => readLocalLibrary().tracks, get: async (id) => trackMap().get(id) ?? null };
  const songs: SongsApi = { get: tracks.get, scrobble: async () => {}, buildStreamUrl: (uri) => uri, scrobbleKind: 'scrobble', streamableCodecs: [] };
  const albumApi: AlbumsApi = {
    list: async () => albums(),
    get: async (id) => { const album = albums().find(item => item.id === id); if (!album) throw new Error('Album not found'); return { ...album, songs: readLocalLibrary().tracks.filter(track => track.albumId === id) } as Album; },
    listWithSongs: async () => Promise.all(albums().map(album => albumApi.get(album.id))),
  };
  const artistApi: ArtistsApi = { list: async () => artists(), get: async (id) => { const artist = artists().find(item => item.id === id); if (!artist) throw new Error('Artist not found'); return artist; } };
  const genres: GenresApi = { list: async () => [] };
  const starred: StarredApi = {
    list: async () => { const snapshot = readLocalLibrary(); const ids = new Set(snapshot.starredIds); return { songs: snapshot.tracks.filter(track => ids.has(track.id)), albums: albums().filter(album => snapshot.tracks.some(track => track.albumId === album.id && ids.has(track.id))) }; },
    add: async (id) => setLocalStarred(id, true), remove: async (id) => setLocalStarred(id, false),
  };
  const playlists: PlaylistsApi = {
    list: async () => readLocalLibrary().playlists.map((entry): PlaylistBase => ({ id: entry.id, title: entry.title, cover: none, subtext: `Playlist • ${entry.trackIds.length} songs`, created: new Date(entry.createdAt), changed: new Date(entry.updatedAt) })),
    get: async (id) => { const entry = readLocalLibrary().playlists.find(item => item.id === id); if (!entry) throw new Error('Playlist not found'); const map = trackMap(); return { id: entry.id, title: entry.title, cover: none, subtext: `Playlist • ${entry.trackIds.length} songs`, created: new Date(entry.createdAt), changed: new Date(entry.updatedAt), songs: entry.trackIds.flatMap(trackId => { const track = map.get(trackId); return track ? [track] : []; }) } as Playlist; },
    create: async (name) => addLocalPlaylist(name), rename: async (id, title) => updateLocalPlaylist(id, { title }),
    addSong: async (playlistId, songId) => { const entry = readLocalLibrary().playlists.find(item => item.id === playlistId); if (!entry) throw new Error('Playlist not found'); updateLocalPlaylist(playlistId, { trackIds: [...entry.trackIds, songId] }); return { success: true }; },
    removeSong: async (playlistId, songId) => { const entry = readLocalLibrary().playlists.find(item => item.id === playlistId); if (!entry) throw new Error('Playlist not found'); const index = entry.trackIds.indexOf(songId); if (index < 0) return { success: false, message: 'Song not found in playlist.' }; updateLocalPlaylist(playlistId, { trackIds: entry.trackIds.filter((_, i) => i !== index) }); return { success: true }; },
    delete: async (id) => removeLocalPlaylist(id),
  };
  const similar: SimilarApi = { getSimilarSongs: async () => [] };
  const lyrics: LyricsApi = { getBySongId: async () => null };
  const search: SearchApi = { search: async (query) => { const term = query.trim().toLocaleLowerCase(); if (!term) return { albums: [], artists: [], songs: [] }; return { albums: albums().filter(album => `${album.title} ${album.artist.name}`.toLocaleLowerCase().includes(term)), artists: artists().filter(artist => artist.name.toLocaleLowerCase().includes(term)), songs: readLocalLibrary().tracks.filter(song => `${song.title} ${song.artist} ${song.albumTitle ?? ''}`.toLocaleLowerCase().includes(term)) }; } };
  return { auth, albums: albumApi, artists: artistApi, genres, playlists, starred, songs, tracks, similar, lyrics, search };
}
