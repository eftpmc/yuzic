import type { MediaItem } from '@rntp/player';
import { Song } from '@/types';
import { buildCover } from './buildCover';

export function normalizeMediaUrl(url: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  if (url.startsWith('/')) return `file://${url}`;
  return url;
}

export function buildTrackItem(song: Song): MediaItem {
  return {
    mediaId: song.id,
    title: song.title,
    artist: song.artist,
    albumTitle: '',
    duration: Number(song.duration) || undefined,
    url: normalizeMediaUrl(song.streamUrl),
    artworkUrl: buildCover(song.cover, 'grid') ?? undefined,
  };
}
