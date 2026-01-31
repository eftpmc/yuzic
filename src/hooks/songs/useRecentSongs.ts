import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Song } from '@/types';
import { useApi } from '@/api';
import { selectSongLastPlayedAt } from '@/utils/redux/selectors/statsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { QueryKeys } from '@/enums/queryKeys';

const MAX_RECENT = 12;

type UseRecentSongsResult = {
  songs: Song[];
  isLoading: boolean;
};

export function useRecentSongs(): UseRecentSongsResult {
  const api = useApi();
  const songLastPlayedAt = useSelector(selectSongLastPlayedAt);
  const activeServer = useSelector(selectActiveServer);

  const songIds = Object.entries(songLastPlayedAt)
    .filter(([, ts]) => ts > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_RECENT)
    .map(([id]) => id);

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
    songs: query.data ?? [],
    isLoading: query.isLoading,
  };
}
