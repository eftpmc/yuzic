import { Song } from '@/types';

export type OfflineMutationFailure = {
  retryCount?: number;
  lastError?: string;
  lastFailedAt?: number;
  nextRetryAt?: number;
};

type OfflineMutationBase = OfflineMutationFailure & {
  id: string;
  serverId: string;
  createdAt: number;
};

export type OfflineMutation =
  | (OfflineMutationBase & {
      type: 'starSong';
      song: Song;
    })
  | (OfflineMutationBase & {
      type: 'unstarSong';
      songId: string;
    })
  | (OfflineMutationBase & {
      type: 'addSongToPlaylist';
      playlistId: string;
      song: Song;
    })
  | (OfflineMutationBase & {
      type: 'removeSongFromPlaylist';
      playlistId: string;
      songId: string;
    })
  | (OfflineMutationBase & {
      type: 'deletePlaylist';
      playlistId: string;
    });

export function createOfflineMutationId(
  type: OfflineMutation['type'],
  parts: string[]
): string {
  return `${type}:${parts.join(':')}:${Date.now()}`;
}

function sameTarget(a: OfflineMutation, b: OfflineMutation): boolean {
  if (a.serverId !== b.serverId) return false;

  if (
    (a.type === 'starSong' || a.type === 'unstarSong') &&
    (b.type === 'starSong' || b.type === 'unstarSong')
  ) {
    const aSongId = a.type === 'starSong' ? a.song.id : a.songId;
    const bSongId = b.type === 'starSong' ? b.song.id : b.songId;
    return aSongId === bSongId;
  }

  if (
    (a.type === 'addSongToPlaylist' || a.type === 'removeSongFromPlaylist') &&
    (b.type === 'addSongToPlaylist' || b.type === 'removeSongFromPlaylist')
  ) {
    const aSongId = a.type === 'addSongToPlaylist' ? a.song.id : a.songId;
    const bSongId = b.type === 'addSongToPlaylist' ? b.song.id : b.songId;
    return a.playlistId === b.playlistId && aSongId === bSongId;
  }

  if (a.type === 'deletePlaylist' && b.type === 'deletePlaylist') {
    return a.playlistId === b.playlistId;
  }

  return false;
}

export function enqueueOfflineMutation(
  queue: OfflineMutation[],
  mutation: OfflineMutation
): OfflineMutation[] {
  return [...queue.filter(item => !sameTarget(item, mutation)), mutation];
}
