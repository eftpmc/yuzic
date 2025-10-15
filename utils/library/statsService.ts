import { fetchLastFmStats, LastFmStats } from '@/utils/lastfm/lastFmService';
import { RootState } from '@/utils/redux/store';
import { setServiceStatus } from '@/utils/redux/slices/libraryStatusSlice';
import { AppDispatch } from '@/utils/redux/store';
import {setStatsMap} from "@/utils/redux/slices/statsSlice";
import {setAlbums} from "@/utils/redux/slices/librarySlice";

export const fetchStatsService = async ({
                                            getState,
                                            dispatch,
                                        }: {
    serverUrl: string;
    username: string;
    password: string;
    getState: () => RootState;
    dispatch: AppDispatch;
}): Promise<{
    key: 'stats';
    status: 'success' | 'error';
    data?: Record<string, LastFmStats>;
    meta?: { fetched: number; total: number };
    error?: string;
}> => {
    try {
        const fetchedAlbums = getState().library.albums;
        const existingStats = getState().stats.statsMap;

        const flatSongs = fetchedAlbums.flatMap(fetchedAlbums => fetchedAlbums.songs || []);
        const songsToFetch = flatSongs.filter(song => {
            const stat = existingStats[song.id];
            return !stat || stat.globalPlayCount === null || stat.globalPlayCount === undefined;
        });

        const total = flatSongs.length;

        if (songsToFetch.length === 0) {
            const updatedAlbums = fetchedAlbums.map(album => ({
                ...album,
                songs: album.songs.map(song => ({
                    ...song,
                    globalPlayCount: existingStats[song.id]?.globalPlayCount ?? song.globalPlayCount ?? null,
                })),
            }));

            dispatch(setAlbums(updatedAlbums));

            dispatch(setServiceStatus({
                key: 'stats',
                status: 'success',
                meta: {
                    fetched: 0,
                    total: flatSongs.length,
                }
            }));

            return {
                key: 'stats',
                status: 'success',
                data: existingStats,
                meta: {
                    fetched: 0,
                    total: flatSongs.length,
                },
            };
        }

        const newStatsMap: Record<string, LastFmStats> = {};

        await fetchLastFmStats(
            songsToFetch,
            ({ fetched }) => {
                dispatch(
                    setServiceStatus({
                        key: 'stats',
                        status: 'pending',
                        meta: { fetched, total },
                    })
                );
            },
            (songId, stat) => {
                newStatsMap[songId] = stat;
                dispatch(setStatsMap({ [songId]: stat }));
            },
            getState
        );

        const mergedStatsMap = {
            ...existingStats,
            ...newStatsMap,
        };

        const updatedAlbums = fetchedAlbums.map(album => ({
            ...album,
            songs: album.songs.map(song => ({
                ...song,
                globalPlayCount: mergedStatsMap[song.id]?.globalPlayCount ?? song.globalPlayCount ?? null,
            })),
        }));

        dispatch(setAlbums(updatedAlbums));

        dispatch(
            setServiceStatus({
                key: 'stats',
                status: 'success',
                meta: {
                    fetched: songsToFetch.length,
                    total,
                },
            })
        );

        return {
            key: 'stats',
            status: 'success',
            data: mergedStatsMap,
            meta: {
                fetched: songsToFetch.length,
                total,
            },
        };
    } catch (err: any) {
        return {
            key: 'stats',
            status: 'error',
            error: err?.message || 'Failed to fetch stats',
        };
    }
};