import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Song } from '@/types';
import { useApi } from '@/api';
import { useTracks } from '@/hooks/tracks';
import shuffleArray from '@/utils/shuffleArray';
import {
  selectSongLastPlayedAt,
  selectSongPlayCounts,
} from '@/utils/redux/selectors/statsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { QueryKeys } from '@/enums/queryKeys';
import { useLibrary } from '@/contexts/LibraryContext';

const MAX_RECENT = 12;
const MIN_DIAL_SONGS = 6;

type UseRecentSongsResult = {
  songs: Song[];
  isLoading: boolean;
};

export function useRecentSongs(): UseRecentSongsResult {
  const api = useApi();
  const { tracks } = useTracks();
  const { albums: libraryAlbums } = useLibrary();
  const songLastPlayedAt = useSelector(selectSongLastPlayedAt);
  const songPlayCounts = useSelector(selectSongPlayCounts);
  const activeServer = useSelector(selectActiveServer);

  const librarySongMap = useMemo(() => {
    const map = new Map<string, Song>();
    for (const album of libraryAlbums) {
      for (const song of album.songs ?? []) {
        map.set(song.id, song);
      }
    }
    return map;
  }, [libraryAlbums]);

  const songIds = useMemo(() => {
    const recentIds = Object.entries(songLastPlayedAt)
      .filter(([, ts]) => ts > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id);

    const byPlayCount = Object.entries(songPlayCounts)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id);

    const seen = new Set<string>(recentIds);
    const merged = [...recentIds];
    for (const id of byPlayCount) {
      if (merged.length >= MAX_RECENT) break;
      if (!seen.has(id)) {
        seen.add(id);
        merged.push(id);
      }
    }
    if (merged.length < MIN_DIAL_SONGS) {
      const fallbackTrackIds = shuffleArray(
        tracks
          .map(track => String(track.id ?? '').trim())
          .filter(Boolean)
          .filter(id => !seen.has(id))
      );

      for (const id of fallbackTrackIds) {
        merged.push(id);
        seen.add(id);
        if (merged.length >= MIN_DIAL_SONGS) break;
      }
    }

    return merged.slice(0, MAX_RECENT);
  }, [songLastPlayedAt, songPlayCounts, tracks]);

  const reduxFallback = useMemo(() => {
    return songIds
      .map(id => librarySongMap.get(id))
      .filter((s): s is Song => !!s);
  }, [songIds, librarySongMap]);

  const query = useQuery<Song[]>({
    queryKey: [QueryKeys.RecentSongs, activeServer?.id, songIds],
    queryFn: async () => {
      const results = await Promise.allSettled(
        songIds.map((id) => api.songs.get(id))
      );
      const songs: Song[] = [];
      for (let i = 0; i < songIds.length; i++) {
        const r = results[i];
        if (r.status === 'fulfilled' && r.value) {
          songs.push(r.value);
        }
      }
      return songs;
    },
    enabled: !!activeServer?.id && songIds.length > 0,
  });

  return {
    songs: query.data ?? reduxFallback,
    isLoading: query.isLoading && reduxFallback.length === 0,
  };
}
