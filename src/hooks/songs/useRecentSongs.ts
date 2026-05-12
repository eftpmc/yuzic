import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { SongBase } from '@/types';
import { useTracks } from '@/hooks/tracks';
import shuffleArray from '@/utils/shuffleArray';
import {
  selectSongLastPlayedAt,
  selectSongPlayCounts,
} from '@/utils/redux/selectors/statsSelectors';

const MAX_RECENT = 12;
const MIN_DIAL_SONGS = 6;

type UseRecentSongsResult = {
  songs: SongBase[];
  isLoading: boolean;
};

export function useRecentSongs(): UseRecentSongsResult {
  const { tracks } = useTracks();
  const songLastPlayedAt = useSelector(selectSongLastPlayedAt);
  const songPlayCounts = useSelector(selectSongPlayCounts);

  const librarySongMap = useMemo(() => {
    const map = new Map<string, SongBase>();
    for (const track of tracks) {
      map.set(track.id, track);
    }
    return map;
  }, [tracks]);

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

  const songs = useMemo(() => {
    return songIds
      .map(id => librarySongMap.get(id))
      .filter((s): s is SongBase => !!s);
  }, [songIds, librarySongMap]);

  return { songs, isLoading: false };
}
