import type { Album, AlbumBase, Artist, CoverSource, Song } from '@/types';
import type { PlexMetadata } from './types';
import type { PlexClient } from './client';

const unknownCover: CoverSource = { kind: 'none' };

const id = (value: string | number | undefined): string => value == null ? '' : String(value);
const seconds = (durationMs: number | undefined): string => String(Math.floor((durationMs ?? 0) / 1000));
const date = (unixSeconds: number | undefined): Date => new Date((unixSeconds ?? 0) * 1000);
const genres = (item: PlexMetadata): string[] =>
  (item.Genre ?? []).flatMap(({ tag }) => tag?.split(';') ?? []).map(tag => tag.trim()).filter(Boolean);

export function plexCover(path: string | undefined): CoverSource {
  return path ? { kind: 'plex', path } : unknownCover;
}

export function normalizePlexArtist(item: PlexMetadata): Artist {
  return {
    id: id(item.ratingKey),
    name: item.title ?? 'Unknown Artist',
    subtext: 'Artist',
    cover: plexCover(item.thumb),
    albumIds: [],
  };
}

export function normalizePlexAlbum(item: PlexMetadata): AlbumBase {
  const artistId = id(item.parentRatingKey);
  const artistName = item.parentTitle ?? 'Unknown Artist';
  return {
    id: id(item.ratingKey),
    title: item.title ?? 'Unknown Album',
    cover: plexCover(item.thumb),
    subtext: `Album • ${artistName}`,
    artist: { id: artistId, name: artistName, cover: plexCover(item.parentThumb), subtext: 'Artist' },
    year: item.year ?? 0,
    genres: genres(item),
    created: date(item.addedAt),
    serverPlayCount: item.viewCount,
    serverLastPlayedAt: item.lastViewedAt ? item.lastViewedAt * 1000 : undefined,
  };
}

/**
 * Plex catalog ids are `ratingKey`; its direct playable resource is the first
 * media part's key. Keep both: catalog operations must use ratingKey while the
 * player must stream the part. See resolvePlayableSong for the rebuild path.
 */
export function normalizePlexSong(item: PlexMetadata, client: PlexClient): Song {
  const media = item.Media?.[0];
  const part = media?.Part?.[0];
  const trackId = id(item.ratingKey);
  const streamId = part?.key;
  return {
    id: trackId,
    title: item.title ?? 'Unknown Track',
    artist: item.grandparentTitle ?? 'Unknown Artist',
    artistId: id(item.grandparentRatingKey),
    albumId: id(item.parentRatingKey),
    albumTitle: item.parentTitle,
    cover: plexCover(item.thumb ?? item.parentThumb),
    duration: seconds(item.duration ?? media?.duration),
    streamUrl: streamId ? client.buildStreamUrl(streamId) : '',
    streamId,
    bitrate: media?.bitrate,
    mimeType: media?.container ? `audio/${media.container}` : undefined,
    filePath: part?.file,
    disc: item.parentIndex,
    trackNumber: item.index,
    year: item.parentYear,
    dateAdded: item.addedAt ? new Date(item.addedAt * 1000).toISOString() : undefined,
    dateReleased: item.originallyAvailableAt,
    genres: genres(item),
    serverPlayCount: item.viewCount,
    serverLastPlayedAt: item.lastViewedAt ? item.lastViewedAt * 1000 : undefined,
  };
}

export function normalizePlexAlbumWithSongs(item: PlexMetadata, songs: Song[]): Album {
  return { ...normalizePlexAlbum(item), songs };
}
