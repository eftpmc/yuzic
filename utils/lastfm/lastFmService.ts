import { RootState } from "@/utils/redux/store";
import { SongData } from "@/types";

export interface LastFmStats {
    songId: string;
    globalPlayCount: number | null;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const fetchLastFmStats = async (
    songs: SongData[],
    onProgress?: (progress: { fetched: number; total: number }) => void,
    onStatFetched?: (songId: string, stat: LastFmStats) => void,
    getState?: () => RootState
): Promise<Record<string, LastFmStats>> => {
    const result: Record<string, LastFmStats> = {};

    // 🧠 Snapshot the state once (if provided)
    const existingStats = getState?.().stats.statsMap ?? {};

    // 🎯 Filter songs that actually need stats
    const songsToFetch = songs.filter(song => {
        const existing = existingStats[song.id];
        return !existing || existing.globalPlayCount === null || existing.globalPlayCount === undefined;
    });

    const total = songsToFetch.length;
    let fetched = 0;

    for (const song of songsToFetch) {
        try {
            const artist = encodeURIComponent(song.artist);
            const title = encodeURIComponent(song.title);
            const res = await fetch(
                `https://rawarr-server-af0092d911f6.herokuapp.com/api/lastfm/track?artist=${artist}&title=${title}`
            );
            const data = await res.json();

            if (data?.error === 29) {
                console.warn('⏳ Rate limit reached, stopping...');
                break;
            }

            const playcount = parseInt(data?.track?.playcount || '0', 10);
            const stat: LastFmStats = {
                songId: song.id,
                globalPlayCount: isNaN(playcount) ? null : playcount,
            };

            result[song.id] = stat;
            onStatFetched?.(song.id, stat);
        } catch {
            const stat: LastFmStats = { songId: song.id, globalPlayCount: null };
            result[song.id] = stat;
            onStatFetched?.(song.id, stat);
        }

        const previouslyFetched = Object.values(existingStats).filter(
            stat => stat.globalPlayCount !== null && stat.globalPlayCount !== undefined
        ).length;

        fetched++;
        onProgress?.({ fetched: previouslyFetched + fetched, total });
        await delay(250);
    }

    return result;
};