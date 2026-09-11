import type {
  ApiAdapter,
  AlbumsApi,
  ArtistsApi,
  AuthApi,
  GenresApi,
  LyricsApi,
  PlaylistsApi,
  SearchApi,
  SimilarApi,
  SongsApi,
  StarredApi,
  TracksApi,
} from '@/api/types';
import type { Playlist, PlaylistBase, Server } from '@/types';
import type { PlexMetadata, PlexResponse } from './types';
import { createPlexClient } from './client';
import { normalizePlexAlbum, normalizePlexAlbumWithSongs, normalizePlexArtist, normalizePlexSong, plexCover } from './normalize';

const FAVORITE_RATING = 10;

function metadata(response: PlexResponse): PlexMetadata[] {
  return response.MediaContainer?.Metadata ?? [];
}

function sectionIds(server: Server): string[] {
  const current = server.auth?.sectionIds;
  if (Array.isArray(current)) return current.map(String);
  const legacy = server.auth?.sectionId;
  return legacy ? [String(legacy)] : [];
}

/** Plex is a distinct protocol, deliberately not a MediaBrowser brand. */
export function createPlexAdapter(server: Server): ApiAdapter {
  const token = server.auth?.token as string | undefined;
  const client = createPlexClient({
    serverUrl: server.serverUrl,
    serverId: server.id,
    fallbackUrls: server.fallbackUrls,
    token,
    basicAuth: server.basicAuth,
  });
  const sections = sectionIds(server);

  async function libraryItems(type: number, extra = ''): Promise<PlexMetadata[]> {
    const ids = sections.length ? sections : (await client.request<PlexResponse>('/library/sections')).MediaContainer?.Directory?.map(s => String(s.key)).filter(Boolean) ?? [];
    const responses = await Promise.all(ids.map(section =>
      client.request<PlexResponse>(`/library/sections/${encodeURIComponent(section)}/all?type=${type}${extra}`)
    ));
    const seen = new Set<string>();
    return responses.flatMap(metadata).filter(item => {
      const key = String(item.ratingKey ?? '');
      return key && !seen.has(key) && (seen.add(key), true);
    });
  }

  async function item(id: string): Promise<PlexMetadata | null> {
    const result = await client.request<PlexResponse>(`/library/metadata/${encodeURIComponent(id)}`);
    return metadata(result)[0] ?? null;
  }

  async function itemTracks(id: string): Promise<PlexMetadata[]> {
    return metadata(await client.request<PlexResponse>(`/library/metadata/${encodeURIComponent(id)}/children`));
  }

  const auth: AuthApi = {
    connect: async () => ({ success: false, message: 'Plex uses code sign-in.' }),
    ping: async () => {
      if (!token) return false;
      // /identity is intentionally public; a protected endpoint is required to
      // distinguish an invalid/expired account token from a reachable server.
      try { await client.request('/library/sections'); return true; } catch { return false; }
    },
    testUrl: async (url) => {
      try {
        const probe = createPlexClient({ serverUrl: url, basicAuth: server.basicAuth });
        await probe.request('/identity');
        return { success: true };
      } catch { return { success: false, message: 'Plex server is not responding.' }; }
    },
    startScan: async () => ({ success: false, message: 'Plex scans are managed on the server.' }),
    disconnect: () => {},
  };

  const albums: AlbumsApi = {
    list: async () => (await libraryItems(9)).map(normalizePlexAlbum),
    get: async (id) => {
      const [album, tracks] = await Promise.all([item(id), itemTracks(id)]);
      if (!album) throw new Error('Album not found');
      return normalizePlexAlbumWithSongs(album, tracks.filter(track => track.type === 'track').map(track => normalizePlexSong(track, client)));
    },
    listWithSongs: async () => {
      const base = await libraryItems(9);
      return Promise.all(base.map(async album => {
        const tracks = await itemTracks(String(album.ratingKey));
        return normalizePlexAlbumWithSongs(album, tracks.filter(track => track.type === 'track').map(track => normalizePlexSong(track, client)));
      }));
    },
  };

  const artists: ArtistsApi = {
    list: async () => (await libraryItems(8)).map(normalizePlexArtist),
    get: async (id) => {
      const artist = await item(id);
      if (!artist) throw new Error('Artist not found');
      const albumIds = (await itemTracks(id)).filter(a => a.type === 'album').map(a => String(a.ratingKey));
      return { ...normalizePlexArtist(artist), albumIds };
    },
  };

  const genres: GenresApi = {
    // Plex's collection-level genre endpoint varies by server/scanner. Album
    // Genre tags are present on the live server, so derive the stable union
    // from those rather than relying on an unverified endpoint.
    list: async () => [...new Set((await libraryItems(9)).flatMap(album => album.Genre?.map(g => g.tag ?? '') ?? []).filter(Boolean))].sort(),
  };

  const tracks: TracksApi = {
    list: async () => (await libraryItems(10)).map(track => normalizePlexSong(track, client)),
    get: async (id) => {
      const track = await item(id);
      return track?.type === 'track' ? normalizePlexSong(track, client) : null;
    },
  };

  const songs: SongsApi = {
    get: tracks.get,
    buildStreamUrl: (partKey) => client.buildStreamUrl(partKey),
    // Plex receives explicit playback/scrobble events; it is not a
    // MediaBrowser "mark played" endpoint.
    scrobbleKind: 'scrobble',
    streamableCodecs: [],
    scrobble: async (songId) => { await client.request(`/:/scrobble?key=${encodeURIComponent(`/library/metadata/${songId}`)}`); },
    reportNowPlaying: async (songId) => { await client.request(`/:/timeline?ratingKey=${encodeURIComponent(songId)}&state=playing&time=0`); },
    reportPlaybackStart: async (songId, positionMs) => { await client.request(`/:/timeline?ratingKey=${encodeURIComponent(songId)}&state=playing&time=${Math.max(0, Math.floor(positionMs))}`); },
    reportPlaybackProgress: async (songId, positionMs, paused) => { await client.request(`/:/timeline?ratingKey=${encodeURIComponent(songId)}&state=${paused ? 'paused' : 'playing'}&time=${Math.max(0, Math.floor(positionMs))}`); },
    reportPlaybackStop: async (songId, positionMs) => { await client.request(`/:/timeline?ratingKey=${encodeURIComponent(songId)}&state=stopped&time=${Math.max(0, Math.floor(positionMs))}`); },
  };

  const starred: StarredApi = {
    list: async () => {
      const items = await libraryItems(10, `&userRating=${FAVORITE_RATING}`);
      const songs = items.map(track => normalizePlexSong(track, client));
      const albums = (await libraryItems(9, `&userRating=${FAVORITE_RATING}`)).map(normalizePlexAlbum);
      return { songs, albums };
    },
    add: async (id) => { await client.request(`/:/rate?key=${encodeURIComponent(`/library/metadata/${id}`)}&rating=${FAVORITE_RATING}`, { method: 'PUT' }); },
    remove: async (id) => { await client.request(`/:/rate?key=${encodeURIComponent(`/library/metadata/${id}`)}&rating=0`, { method: 'PUT' }); },
  };

  const playlists: PlaylistsApi = {
    list: async () => metadata(await client.request<PlexResponse>('/playlists?playlistType=audio')).map((p): PlaylistBase => ({
      id: String(p.ratingKey), title: p.title ?? 'Untitled playlist', cover: plexCover(p.thumb),
      subtext: `Playlist • ${p.leafCount ?? 0} songs`, created: new Date((p.addedAt ?? 0) * 1000), changed: new Date((p.updatedAt ?? p.addedAt ?? 0) * 1000),
    })),
    get: async (id) => {
      const base = metadata(await client.request<PlexResponse>(`/playlists/${encodeURIComponent(id)}`))[0];
      if (!base) throw new Error('Playlist not found');
      const entries = metadata(await client.request<PlexResponse>(`/playlists/${encodeURIComponent(id)}/items`));
      return { id, title: base.title ?? 'Untitled playlist', cover: plexCover(base.thumb), subtext: `Playlist • ${entries.length} songs`, created: new Date((base.addedAt ?? 0) * 1000), changed: new Date((base.updatedAt ?? base.addedAt ?? 0) * 1000), songs: entries.map(entry => normalizePlexSong(entry, client)) } as Playlist;
    },
    create: async () => { throw new Error('Creating Plex playlists is not available yet.'); },
    rename: async () => { throw new Error('Renaming Plex playlists is not available yet.'); },
    addSong: async () => ({ success: false, message: 'Editing Plex playlists is not available yet.' }),
    removeSong: async () => ({ success: false, message: 'Editing Plex playlists is not available yet.' }),
    delete: async () => { throw new Error('Deleting Plex playlists is not available yet.'); },
  };

  const similar: SimilarApi = { getSimilarSongs: async () => [] };
  const lyrics: LyricsApi = { getBySongId: async () => null };
  const search: SearchApi = {
    search: async (query) => {
      if (!query.trim()) return { albums: [], artists: [], songs: [] };
      const response = await client.request<PlexResponse>(`/hubs/search?query=${encodeURIComponent(query)}`);
      const results = response.MediaContainer?.Hub?.flatMap(hub => hub.Metadata ?? []) ?? metadata(response);
      return {
        albums: results.filter(result => result.type === 'album').map(normalizePlexAlbum),
        artists: results.filter(result => result.type === 'artist').map(normalizePlexArtist),
        songs: results.filter(result => result.type === 'track').map(result => normalizePlexSong(result, client)),
      };
    },
  };

  return { auth, albums, artists, genres, playlists, starred, songs, tracks, similar, lyrics, search };
}
