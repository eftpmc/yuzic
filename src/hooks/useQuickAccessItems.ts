import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AlbumBase, Artist, PlaylistBase, SongBase } from '@/types';
import { useAlbums } from '@/hooks/albums';
import { usePlaylists } from '@/hooks/playlists';
import {
  selectSongLastPlayedAt,
  selectSongPlayCounts,
  selectPlaylistPlayCounts,
  selectPlaylistLastPlayedAt,
} from '@/utils/redux/selectors/statsSelectors';
import {
  selectSongsById,
} from '@/utils/redux/selectors/librarySelectors';
import shuffleArray from '@/utils/shuffleArray';

const TRACK_SLOTS = 3;
const PLAYLIST_SLOTS = 3;
const DECAY_MS = 14 * 24 * 60 * 60 * 1000; // 14-day half-life

export type QuickAccessItem =
  | { kind: 'album';    data: AlbumBase;    ts: number }
  | { kind: 'artist';   data: Artist;   ts: number }
  | { kind: 'playlist'; data: PlaylistBase; ts: number }
  | { kind: 'track';    data: SongBase;     ts: number };

function score(ts: number, playCount: number, now: number): number {
  const recency = ts > 0 ? Math.exp(-(now - ts) / DECAY_MS) : 0;
  const freq = playCount > 0 ? Math.log(playCount + 1) / Math.log(50) : 0;
  return recency * 0.6 + freq * 0.4;
}

export function useQuickAccessItems(): QuickAccessItem[] {
  const { albums } = useAlbums();
  const { playlists } = usePlaylists();
  const songsById = useSelector(selectSongsById);
  const songLastPlayedAt = useSelector(selectSongLastPlayedAt);
  const songPlayCounts = useSelector(selectSongPlayCounts);
  const playlistPlayCounts = useSelector(selectPlaylistPlayCounts);
  const playlistLastPlayedAt = useSelector(selectPlaylistLastPlayedAt);

  return useMemo(() => {
    const now = Date.now();

    // --- Tracks: scored by play history, fallback to random library songs ---
    type Scored<T> = { item: T; score: number; ts: number };

    const scoredTracks: Scored<SongBase>[] = [];
    for (const [id, ts] of Object.entries(songLastPlayedAt)) {
      if (ts <= 0) continue;
      const data = songsById.get(id);
      if (data) scoredTracks.push({ item: data, ts, score: score(ts, songPlayCounts[id] ?? 0, now) });
    }
    scoredTracks.sort((a, b) => b.score - a.score);

    const pickedTracks: QuickAccessItem[] = [];
    const usedTrackIds = new Set<string>();
    for (const { item, ts } of scoredTracks) {
      if (pickedTracks.length >= TRACK_SLOTS) break;
      usedTrackIds.add(item.id);
      pickedTracks.push({ kind: 'track', data: item, ts });
    }

    if (pickedTracks.length < TRACK_SLOTS) {
      const needed = TRACK_SLOTS - pickedTracks.length;
      const candidates: SongBase[] = [];
      songsById.forEach(s => { if (!usedTrackIds.has(s.id)) candidates.push(s); });
      // Partial Fisher-Yates: only shuffle the first `needed` positions instead of the full array.
      for (let i = 0; i < needed && i < candidates.length; i++) {
        const j = i + Math.floor(Math.random() * (candidates.length - i));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        pickedTracks.push({ kind: 'track', data: candidates[i], ts: 0 });
      }
    }

    // --- Playlists: all scored (score 0 if no history), sorted, pick top slots ---
    const scoredPlaylists: Scored<PlaylistBase>[] = playlists.map(playlist => {
      const changedTs = playlist.changed ? new Date(playlist.changed).getTime() : 0;
      const playedTs = playlistLastPlayedAt[playlist.id] ?? 0;
      const ts = Math.max(changedTs, playedTs);
      return { item: playlist, ts, score: score(ts, playlistPlayCounts[playlist.id] ?? 0, now) };
    });
    scoredPlaylists.sort((a, b) => b.score - a.score);

    const pickedPlaylists: QuickAccessItem[] = [];
    const usedPlaylistIds = new Set<string>();
    for (const { item, ts } of scoredPlaylists) {
      if (pickedPlaylists.length >= PLAYLIST_SLOTS) break;
      usedPlaylistIds.add(item.id);
      pickedPlaylists.push({ kind: 'playlist', data: item, ts });
    }

    // --- Interleave: [playlist, track, playlist, track, …] ---
    const result: QuickAccessItem[] = [];
    const len = Math.max(pickedPlaylists.length, pickedTracks.length);
    for (let i = 0; i < len; i++) {
      if (pickedPlaylists[i]) result.push(pickedPlaylists[i]);
      if (pickedTracks[i]) result.push(pickedTracks[i]);
    }

    // Final fallback: fill any remaining slots with random albums so the dial is never empty
    if (result.length < TRACK_SLOTS + PLAYLIST_SLOTS) {
      const usedAlbumIds = new Set<string>();
      const random = shuffleArray(albums.filter(a => !usedAlbumIds.has(a.id)));
      for (const data of random) {
        if (result.length >= TRACK_SLOTS + PLAYLIST_SLOTS) break;
        result.push({ kind: 'album', data, ts: 0 });
      }
    }

    return result;
  }, [
    songLastPlayedAt, songPlayCounts,
    playlistPlayCounts, playlistLastPlayedAt,
    songsById, albums, playlists,
  ]);
}
