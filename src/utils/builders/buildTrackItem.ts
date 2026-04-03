import type { TrackItem } from 'react-native-nitro-player';
import { Song } from '@/types';
import { buildCover } from './buildCover';

export function buildTrackItem(song: Song, playlistId?: string): TrackItem {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: '',
    duration: parseFloat(song.duration || '0'),
    url: song.streamUrl,
    artwork: buildCover(song.cover, 'grid') ?? undefined,
    extraPayload: {
      albumId: song.albumId ?? '',
      artistId: song.artistId ?? '',
      serverId: song.sourceServerId ?? '',
      serverType: song.sourceServerType ?? '',
      ...(playlistId ? { playlistId } : {}),
    },
  };
}
