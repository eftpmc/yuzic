import type { MediaItem } from '@rntp/player';
import { Song } from '@/types';
import { buildCover } from './buildCover';

export function buildTrackItem(song: Song): MediaItem {
  return {
    mediaId: song.id,
    title: song.title,
    artist: song.artist,
    albumTitle: '',
    duration: Number(song.duration) || undefined,
    url: song.streamUrl,
    artworkUrl: buildCover(song.cover, 'grid') ?? undefined,
  };
}
