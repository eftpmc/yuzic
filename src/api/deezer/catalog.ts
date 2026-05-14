import { deezerClient } from './client';
import type { CoverSource, ExternalAlbum, ExternalAlbumBase, ExternalArtistBase, ExternalSong } from '@/types';

type DeezerImageEntity = {
  picture_xl?: string | null;
  picture_big?: string | null;
  picture_medium?: string | null;
  cover_xl?: string | null;
  cover_big?: string | null;
  cover_medium?: string | null;
};

type DeezerArtist = DeezerImageEntity & {
  id: number;
  name: string;
  nb_album?: number;
  nb_fan?: number;
  description?: string;
};

type DeezerAlbum = DeezerImageEntity & {
  id: number;
  title: string;
  artist: DeezerArtist;
  release_date?: string | null;
  record_type?: string | null;
  nb_tracks?: number;
  upc?: string | null;
  tracks?: { data?: DeezerTrack[] };
};

type DeezerTrack = {
  id: number;
  title: string;
  duration?: number;
  preview?: string | null;
  isrc?: string | null;
  rank?: number;
  artist?: DeezerArtist;
  album?: DeezerAlbum;
};

type DeezerListResponse<T> = {
  data?: T[];
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const SEARCH_CACHE_MS = 12 * HOUR_MS;
const ARTIST_CACHE_MS = 7 * DAY_MS;
const ARTIST_ALBUMS_CACHE_MS = DAY_MS;
const RELATED_ARTISTS_CACHE_MS = 7 * DAY_MS;
const TRACKS_CACHE_MS = DAY_MS;
const ALBUM_CACHE_MS = DAY_MS;
const GENRE_CACHE_MS = 30 * DAY_MS;
const CHART_CACHE_MS = 6 * HOUR_MS;
const EMPTY_CACHE_MS = HOUR_MS;

const memoryCache = new Map<string, { expiresAt: number; value: unknown }>();
const pendingRequests = new Map<string, Promise<unknown>>();

function cacheTtl<T>(value: T, ttlMs: number): number {
  return Array.isArray(value) && value.length === 0 ? EMPTY_CACHE_MS : ttlMs;
}

async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = memoryCache.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const pending = pendingRequests.get(key);
  if (pending) return pending as Promise<T>;

  const request = loader()
    .then(value => {
      memoryCache.set(key, {
        expiresAt: Date.now() + cacheTtl(value, ttlMs),
        value,
      });
      return value;
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, request);
  return request;
}

function bestImage(entity: DeezerImageEntity, kind: 'artist' | 'album'): CoverSource {
  const url = kind === 'artist'
    ? entity.picture_xl ?? entity.picture_big ?? entity.picture_medium
    : entity.cover_xl ?? entity.cover_big ?? entity.cover_medium;

  return url ? { kind: 'url', url } : { kind: 'none' };
}

function albumReleaseType(recordType?: string | null): ExternalAlbumBase['releaseType'] {
  return recordType === 'single' || recordType === 'ep' ? 'single' : 'album';
}

function artistSubtext(artist: DeezerArtist): string {
  if (typeof artist.nb_album === 'number' && artist.nb_album > 0) return `${artist.nb_album} albums`;
  if (typeof artist.nb_fan === 'number' && artist.nb_fan > 0) return `${artist.nb_fan.toLocaleString()} fans`;
  return '';
}

export function deezerArtistToExternal(artist: DeezerArtist): ExternalArtistBase {
  const id = String(artist.id);
  return {
    id,
    name: artist.name,
    subtext: artistSubtext(artist),
    cover: bestImage(artist, 'artist'),
    biography: artist.description || undefined,
    externalSource: 'deezer',
    externalIds: { deezerId: id },
  };
}

export function deezerAlbumToExternal(
  album: DeezerAlbum,
  fallbackArtist?: ExternalArtistBase | null
): ExternalAlbumBase {
  const id = String(album.id);
  const artistId = album.artist?.id != null ? String(album.artist.id) : fallbackArtist?.externalIds?.deezerId;
  const artistName = album.artist?.name ?? fallbackArtist?.name ?? '';
  return {
    id,
    title: album.title,
    artist: artistName,
    subtext: artistName,
    cover: bestImage(album, 'album'),
    releaseDate: album.release_date ?? undefined,
    releaseType: albumReleaseType(album.record_type),
    externalSource: 'deezer',
    externalIds: {
      deezerId: id,
      artistDeezerId: artistId,
      upc: album.upc ?? null,
    },
  };
}

function deezerTrackToExternal(track: DeezerTrack, album: DeezerAlbum): ExternalSong {
  const id = String(track.id);
  return {
    id,
    title: track.title,
    artist: track.artist?.name ?? album.artist?.name ?? '',
    albumId: String(album.id),
    duration: String(track.duration ?? 0),
    cover: bestImage(album, 'album'),
    previewUrl: track.preview ?? null,
    externalSource: 'deezer',
    externalIds: {
      deezerId: id,
      isrc: track.isrc ?? null,
    },
  };
}

async function requestList<T>(path: string): Promise<T[]> {
  const res = await deezerClient.request<DeezerListResponse<T>>(path);
  return Array.isArray(res.data) ? res.data : [];
}

export async function searchDeezerArtists(query: string, limit = 5): Promise<ExternalArtistBase[]> {
  if (!query.trim()) return [];
  return cached(`search-artists:${query.trim().toLowerCase()}:${limit}`, SEARCH_CACHE_MS, async () => {
    const artists = await requestList<DeezerArtist>(`/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`);
    return artists.map(deezerArtistToExternal);
  });
}

export async function searchDeezerAlbums(query: string, limit = 8): Promise<ExternalAlbumBase[]> {
  if (!query.trim()) return [];
  return cached(`search-albums:${query.trim().toLowerCase()}:${limit}`, SEARCH_CACHE_MS, async () => {
    const albums = await requestList<DeezerAlbum>(`/search/album?q=${encodeURIComponent(query)}&limit=${limit}`);
    return albums.map(album => deezerAlbumToExternal(album));
  });
}

export async function getDeezerArtist(artistId: string): Promise<ExternalArtistBase | null> {
  return cached(`artist:${artistId}`, ARTIST_CACHE_MS, async () => {
    const artist = await deezerClient.request<DeezerArtist>(`/artist/${encodeURIComponent(artistId)}`);
    return artist?.id ? deezerArtistToExternal(artist) : null;
  });
}

export async function getDeezerArtistAlbums(
  artistId: string,
  limit = 50,
  fallbackArtist?: ExternalArtistBase | null
): Promise<ExternalAlbumBase[]> {
  const fallbackKey = fallbackArtist?.id ?? fallbackArtist?.name ?? '';
  return cached(`artist-albums:${artistId}:${limit}:${fallbackKey}`, ARTIST_ALBUMS_CACHE_MS, async () => {
    const albums = await requestList<DeezerAlbum>(`/artist/${encodeURIComponent(artistId)}/albums?limit=${limit}`);
    return albums.map(album => deezerAlbumToExternal(album, fallbackArtist));
  });
}

export async function getDeezerRelatedArtists(artistId: string, limit = 12): Promise<ExternalArtistBase[]> {
  return cached(`related-artists:${artistId}:${limit}`, RELATED_ARTISTS_CACHE_MS, async () => {
    const artists = await requestList<DeezerArtist>(`/artist/${encodeURIComponent(artistId)}/related?limit=${limit}`);
    return artists.map(deezerArtistToExternal);
  });
}

export async function getDeezerArtistTopTracks(artistId: string, limit = 10): Promise<ExternalSong[]> {
  return cached(`artist-top-tracks:${artistId}:${limit}`, TRACKS_CACHE_MS, async () => {
    const tracks = await requestList<DeezerTrack>(`/artist/${encodeURIComponent(artistId)}/top?limit=${limit}`);
    return tracks
      .filter(track => track.album)
      .map(track => deezerTrackToExternal(track, track.album!));
  });
}

export async function getDeezerAlbum(albumId: string): Promise<ExternalAlbum | null> {
  return cached(`album:${albumId}`, ALBUM_CACHE_MS, async () => {
    const album = await deezerClient.request<DeezerAlbum>(`/album/${encodeURIComponent(albumId)}`);
    if (!album?.id) return null;

    const base = deezerAlbumToExternal(album);
    const songs = (album.tracks?.data ?? []).map(track => deezerTrackToExternal(track, album));

    return {
      ...base,
      songs,
    };
  });
}

export async function resolveDeezerArtistByName(name: string): Promise<ExternalArtistBase | null> {
  if (!name.trim()) return null;
  return cached(`resolve-artist:${name.trim().toLowerCase()}`, SEARCH_CACHE_MS, async () => {
    const [artist] = await searchDeezerArtists(name, 1);
    return artist ?? null;
  });
}

export async function getDeezerGenreList(): Promise<{ id: number; name: string }[]> {
  return cached('genres', GENRE_CACHE_MS, async () => {
    const res = await deezerClient.request<{ data?: { id: number; name: string }[] }>('/genre');
    return res?.data ?? [];
  });
}

export async function getDeezerArtistsByGenreId(genreId: number, limit = 20): Promise<ExternalArtistBase[]> {
  return cached(`genre-artists:${genreId}:${limit}`, GENRE_CACHE_MS, async () => {
    const artists = await requestList<DeezerArtist>(`/genre/${genreId}/artists?limit=${limit}`);
    return artists.map(deezerArtistToExternal);
  });
}

export async function getDeezerChartArtists(limit = 10): Promise<ExternalArtistBase[]> {
  return cached(`chart-artists:${limit}`, CHART_CACHE_MS, async () => {
    const artists = await requestList<DeezerArtist>(`/chart/0/artists?limit=${limit}`);
    return artists.map(deezerArtistToExternal);
  });
}

export async function getDeezerChartAlbums(limit = 10): Promise<ExternalAlbumBase[]> {
  return cached(`chart-albums:${limit}`, CHART_CACHE_MS, async () => {
    const albums = await requestList<DeezerAlbum>(`/chart/0/albums?limit=${limit * 2}`);
    const seenArtists = new Set<string>();
    const result: ExternalAlbumBase[] = [];
    for (const album of albums) {
      const artistKey = (album.artist?.name ?? '').toLowerCase();
      if (artistKey && seenArtists.has(artistKey)) continue;
      if (artistKey) seenArtists.add(artistKey);
      result.push(deezerAlbumToExternal(album));
      if (result.length >= limit) break;
    }
    return result;
  });
}

export async function resolveDeezerAlbum(artist: string, title: string): Promise<ExternalAlbumBase | null> {
  const key = `${artist.trim().toLowerCase()}:${title.trim().toLowerCase()}`;
  return cached(`resolve-album:${key}`, SEARCH_CACHE_MS, async () => {
    const precise = await searchDeezerAlbums(`artist:"${artist}" album:"${title}"`, 1);
    if (precise[0]) return precise[0];
    const fallback = await searchDeezerAlbums(`${artist} ${title}`, 1);
    return fallback[0] ?? null;
  });
}
