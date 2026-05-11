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
  const artists = await requestList<DeezerArtist>(`/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`);
  return artists.map(deezerArtistToExternal);
}

export async function searchDeezerAlbums(query: string, limit = 8): Promise<ExternalAlbumBase[]> {
  if (!query.trim()) return [];
  const albums = await requestList<DeezerAlbum>(`/search/album?q=${encodeURIComponent(query)}&limit=${limit}`);
  return albums.map(album => deezerAlbumToExternal(album));
}

export async function getDeezerArtist(artistId: string): Promise<ExternalArtistBase | null> {
  const artist = await deezerClient.request<DeezerArtist>(`/artist/${encodeURIComponent(artistId)}`);
  return artist?.id ? deezerArtistToExternal(artist) : null;
}

export async function getDeezerArtistAlbums(
  artistId: string,
  limit = 50,
  fallbackArtist?: ExternalArtistBase | null
): Promise<ExternalAlbumBase[]> {
  const albums = await requestList<DeezerAlbum>(`/artist/${encodeURIComponent(artistId)}/albums?limit=${limit}`);
  return albums.map(album => deezerAlbumToExternal(album, fallbackArtist));
}

export async function getDeezerRelatedArtists(artistId: string, limit = 12): Promise<ExternalArtistBase[]> {
  const artists = await requestList<DeezerArtist>(`/artist/${encodeURIComponent(artistId)}/related?limit=${limit}`);
  return artists.map(deezerArtistToExternal);
}

export async function getDeezerArtistTopTracks(artistId: string, limit = 10): Promise<ExternalSong[]> {
  const tracks = await requestList<DeezerTrack>(`/artist/${encodeURIComponent(artistId)}/top?limit=${limit}`);
  return tracks
    .filter(track => track.album)
    .map(track => deezerTrackToExternal(track, track.album!));
}

export async function getDeezerAlbum(albumId: string): Promise<ExternalAlbum | null> {
  const album = await deezerClient.request<DeezerAlbum>(`/album/${encodeURIComponent(albumId)}`);
  if (!album?.id) return null;

  const base = deezerAlbumToExternal(album);
  const songs = (album.tracks?.data ?? []).map(track => deezerTrackToExternal(track, album));

  return {
    ...base,
    songs,
  };
}

export async function resolveDeezerArtistByName(name: string): Promise<ExternalArtistBase | null> {
  const [artist] = await searchDeezerArtists(name, 1);
  return artist ?? null;
}

export async function getDeezerGenreList(): Promise<{ id: number; name: string }[]> {
  const res = await deezerClient.request<{ data?: { id: number; name: string }[] }>('/genre');
  return res?.data ?? [];
}

export async function getDeezerArtistsByGenreId(genreId: number, limit = 20): Promise<ExternalArtistBase[]> {
  const artists = await requestList<DeezerArtist>(`/genre/${genreId}/artists?limit=${limit}`);
  return artists.map(deezerArtistToExternal);
}

export async function getDeezerChartAlbums(limit = 10): Promise<ExternalAlbumBase[]> {
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
}

export async function getNewReleasesForArtists(
  artistNames: string[],
  maxResults = 10,
  monthsBack = 6
): Promise<ExternalAlbumBase[]> {
  if (!artistNames.length) return [];

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  const results = await Promise.allSettled(
    artistNames.map(async name => {
      const artist = await resolveDeezerArtistByName(name);
      if (!artist) return [] as ExternalAlbumBase[];
      return getDeezerArtistAlbums(artist.id, 10, artist);
    })
  );

  const seenIds = new Set<string>();
  const seenArtists = new Set<string>();
  const recent: ExternalAlbumBase[] = [];

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const album of result.value) {
      if (!album.releaseDate) continue;
      if (seenIds.has(album.id)) continue;
      const date = new Date(album.releaseDate);
      if (isNaN(date.getTime()) || date < cutoff) continue;
      const artistKey = album.artist.toLowerCase();
      if (seenArtists.has(artistKey)) continue;
      seenIds.add(album.id);
      seenArtists.add(artistKey);
      recent.push(album);
    }
  }

  return recent
    .sort((a, b) => new Date(b.releaseDate!).getTime() - new Date(a.releaseDate!).getTime())
    .slice(0, maxResults);
}

export async function resolveDeezerAlbum(artist: string, title: string): Promise<ExternalAlbumBase | null> {
  const precise = await searchDeezerAlbums(`artist:"${artist}" album:"${title}"`, 1);
  if (precise[0]) return precise[0];
  const fallback = await searchDeezerAlbums(`${artist} ${title}`, 1);
  return fallback[0] ?? null;
}
