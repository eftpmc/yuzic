import { RootState } from "@/utils/redux/store";
import { SongData } from "@/types";
import { getLastFmTrackStats } from "@/api/lastfm/getTrackStats";

export interface LastFmStats {
    songId: string;
    globalPlayCount: number | null;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const fetchLastFmStats = async (
    songs: SongData[],
    onProgress?: (progress: { fetched: number; total: number }) => void,
    onStatFetched?: (songId: string, stat: LastFmStats) => void,
    getState?: () => RootState
): Promise<Record<string, LastFmStats>> => {
    const result: Record<string, LastFmStats> = {};
    const existingStats = getState?.().stats.statsMap ?? {};

    const songsToFetch = songs.filter(song => {
        const existing = existingStats[song.id];
        return !existing || existing.globalPlayCount == null;
    });

    const total = songsToFetch.length;
    let fetched = 0;

    for (const song of songsToFetch) {
        let stat: LastFmStats;

        try {
            const data = await getLastFmTrackStats(song.artist, song.title);

            if (data?.error === 29) break;

            const count = parseInt(data?.track?.playcount || "0", 10);
            stat = { songId: song.id, globalPlayCount: isNaN(count) ? null : count };
        } catch {
            stat = { songId: song.id, globalPlayCount: null };
        }

        result[song.id] = stat;
        onStatFetched?.(song.id, stat);

        const alreadyFetched = Object.values(existingStats)
            .filter(s => s.globalPlayCount != null)
            .length;

        fetched++;
        onProgress?.({ fetched: alreadyFetched + fetched, total });

        await delay(250);
    }

    return result;
};