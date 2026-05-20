import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { useDownloadActions } from '@/contexts/DownloadContext';
import { selectSongsById } from '@/utils/redux/selectors/librarySelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import type { Song, SongBase } from '@/types';

const DEFAULT_TIMEOUT_MS = 5000;

export type PlayableSongInput = string | SongBase | Song | null | undefined;

type ResolvePlayableSongOptions = {
  allowNetwork?: boolean;
  timeoutMs?: number;
};

export function isPlayableSong(song: PlayableSongInput): song is Song {
  return typeof song === 'object' &&
    !!song &&
    'streamUrl' in song &&
    typeof song.streamUrl === 'string' &&
    song.streamUrl.length > 0;
}

function songIdFromInput(input: PlayableSongInput): string | null {
  if (!input) return null;
  return typeof input === 'string' ? input : input.id;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export function usePlayableSongResolver() {
  const api = useApi();
  const queryClient = useQueryClient();
  const activeServer = useSelector(selectActiveServer);
  const songsById = useSelector(selectSongsById);
  const { getLocalPath } = useDownloadActions();

  const resolvePlayableSong = useCallback(async (
    input: PlayableSongInput,
    options: ResolvePlayableSongOptions = {}
  ): Promise<Song | null> => {
    if (isPlayableSong(input)) return input;

    const songId = songIdFromInput(input);
    if (!songId) return null;

    const baseSong = typeof input === 'string' ? songsById.get(songId) : input;
    const localPath = getLocalPath(songId);
    if (localPath && baseSong) {
      const localSong = { ...baseSong, streamUrl: localPath, filePath: localPath } as Song;
      queryClient.setQueryData([QueryKeys.Song, activeServer?.id, songId], localSong);
      return localSong;
    }

    const cachedSong = queryClient.getQueryData<Song | null>([QueryKeys.Song, activeServer?.id, songId]);
    if (isPlayableSong(cachedSong)) return cachedSong;

    if (options.allowNetwork === false) return null;

    const fetchedSong = await withTimeout(
      api.tracks.get(songId),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    ).catch(() => null);

    if (!isPlayableSong(fetchedSong)) return null;
    queryClient.setQueryData([QueryKeys.Song, activeServer?.id, songId], fetchedSong);
    return fetchedSong;
  }, [activeServer?.id, api.tracks, getLocalPath, queryClient, songsById]);

  return { resolvePlayableSong };
}
