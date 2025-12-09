import { fetchLastFmStats, LastFmStats } from '@/utils/lastfm/lastFmService';
import { RootState } from '@/utils/redux/store';
import { setServiceStatus } from '@/utils/redux/slices/libraryStatusSlice';
import { AppDispatch } from '@/utils/redux/store';
import { setStatsMap } from '@/utils/redux/slices/statsSlice';
import { setAlbums } from '@/utils/redux/slices/librarySlice';

export const fetchStatsService = async ({
  getState,
  dispatch,
}: {
  serverUrl: string;
  username: string;
  password: string;
  getState: () => RootState;
  dispatch: AppDispatch;
}) => {
  try {
    const fetchedAlbums = getState().library.albums;
    const existingStats = getState().stats.statsMap;
    const flatSongs = fetchedAlbums.flatMap(a => a.songs || []);

    const songsToFetch = flatSongs.filter(song => {
      const stat = existingStats[song.id];
      return !stat || stat.globalPlayCount == null;
    });

    const total = flatSongs.length;

    // Initialize status
    dispatch(setServiceStatus({ key: 'stats', status: 'pending', meta: { fetched: 0, total } }));

    if (songsToFetch.length === 0) {
      dispatch(setServiceStatus({ key: 'stats', status: 'success', meta: { fetched: 0, total } }));
      return { key: 'stats', status: 'success' };
    }

    const newStatsMap: Record<string, LastFmStats> = {};
    let fetchedCount = 0;
    let batchCount = 0;

    await fetchLastFmStats(
      songsToFetch,
      // ignore per-song callback updates
      () => {},
      (songId, stat) => {
        newStatsMap[songId] = stat;
        fetchedCount++;
        batchCount++;

        // every 100 songs: emit a lightweight progress event only
        if (batchCount >= 100) {
          dispatch(
            setServiceStatus({
              key: 'stats',
              status: 'pending',
              meta: { fetched: fetchedCount, total },
            })
          );
          batchCount = 0;
        }
      },
      getState
    );

    // Final success update
    dispatch(
      setServiceStatus({
        key: 'stats',
        status: 'success',
        meta: { fetched: fetchedCount, total },
      })
    );

    // Merge & update once
    const mergedStats = { ...existingStats, ...newStatsMap };

    const updatedAlbums = fetchedAlbums.map(album => ({
      ...album,
      songs: album.songs.map(song => ({
        ...song,
        globalPlayCount:
          mergedStats[song.id]?.globalPlayCount ?? song.globalPlayCount ?? null,
      })),
    }));

    // One-time dispatch for final data
    dispatch(setStatsMap(mergedStats));
    dispatch(setAlbums(updatedAlbums));

    return {
      key: 'stats',
      status: 'success',
      data: mergedStats,
      meta: { fetched: fetchedCount, total },
    };
  } catch (err: any) {
    dispatch(setServiceStatus({ key: 'stats', status: 'error', meta: { fetched: 0, total: 0 } }));
    return {
      key: 'stats',
      status: 'error',
      error: err?.message || 'Failed to fetch stats',
    };
  }
};