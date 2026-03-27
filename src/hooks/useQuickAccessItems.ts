import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Album, Artist, Playlist, Song } from '@/types';
import { useLibrary } from '@/contexts/LibraryContext';
import {
  selectAlbumLastPlayedAt,
  selectArtistLastPlayedAt,
  selectSongLastPlayedAt,
  selectAlbumPlayCounts,
  selectArtistPlayCounts,
  selectSongPlayCounts,
  selectPlaylistPlayCounts,
  selectPlaylistLastPlayedAt,
} from '@/utils/redux/selectors/statsSelectors';
import {
  selectAlbumsById,
  selectArtistsById,
  selectSongsById,
} from '@/utils/redux/selectors/librarySelectors';
import shuffleArray from '@/utils/shuffleArray';

const MAX_ITEMS = 6;
const DECAY_MS = 14 * 24 * 60 * 60 * 1000; // 14-day half-life

export type QuickAccessItem =
  | { kind: 'album';    data: Album;    ts: number }
  | { kind: 'artist';   data: Artist;   ts: number }
  | { kind: 'playlist'; data: Playlist; ts: number }
  | { kind: 'track';    data: Song;     ts: number };

function score(ts: number, playCount: number, now: number): number {
  const recency = ts > 0 ? Math.exp(-(now - ts) / DECAY_MS) : 0;
  const freq = playCount > 0 ? Math.log(playCount + 1) / Math.log(50) : 0;
  return recency * 0.6 + freq * 0.4;
}

export function useQuickAccessItems(): QuickAccessItem[] {
  const { albums, playlists } = useLibrary();
  const albumsById = useSelector(selectAlbumsById);
  const artistsById = useSelector(selectArtistsById);
  const songsById = useSelector(selectSongsById);
  const albumLastPlayedAt = useSelector(selectAlbumLastPlayedAt);
  const artistLastPlayedAt = useSelector(selectArtistLastPlayedAt);
  const songLastPlayedAt = useSelector(selectSongLastPlayedAt);
  const albumPlayCounts = useSelector(selectAlbumPlayCounts);
  const artistPlayCounts = useSelector(selectArtistPlayCounts);
  const songPlayCounts = useSelector(selectSongPlayCounts);
  const playlistPlayCounts = useSelector(selectPlaylistPlayCounts);
  const playlistLastPlayedAt = useSelector(selectPlaylistLastPlayedAt);

  return useMemo(() => {
    const now = Date.now();
    const candidates: (QuickAccessItem & { score: number })[] = [];

    for (const [id, ts] of Object.entries(albumLastPlayedAt)) {
      const data = albumsById.get(id);
      if (data) candidates.push({ kind: 'album', data, ts, score: score(ts, albumPlayCounts[id] ?? 0, now) });
    }

    for (const [id, ts] of Object.entries(artistLastPlayedAt)) {
      const data = artistsById.get(id);
      if (data) candidates.push({ kind: 'artist', data, ts, score: score(ts, artistPlayCounts[id] ?? 0, now) });
    }

    // Tracks only appear if they've been played at least once
    for (const [id, ts] of Object.entries(songLastPlayedAt)) {
      if (ts <= 0) continue;
      const data = songsById.get(id);
      if (data) candidates.push({ kind: 'track', data, ts, score: score(ts, songPlayCounts[id] ?? 0, now) });
    }

    for (const playlist of playlists) {
      const changedTs = playlist.changed ? new Date(playlist.changed).getTime() : 0;
      const playedTs = playlistLastPlayedAt[playlist.id] ?? 0;
      const ts = Math.max(changedTs, playedTs);
      if (ts <= 0) continue;
      const s = score(ts, playlistPlayCounts[playlist.id] ?? 0, now);
      candidates.push({ kind: 'playlist', data: playlist, ts, score: s });
    }

    candidates.sort((a, b) => b.score - a.score);

    const result: QuickAccessItem[] = [];
    const usedIds = new Set<string>();

    for (const item of candidates) {
      if (result.length >= MAX_ITEMS) break;
      const key = `${item.kind}:${item.data.id}`;
      if (!usedIds.has(key)) {
        usedIds.add(key);
        result.push({ kind: item.kind, data: item.data, ts: item.ts } as QuickAccessItem);
      }
    }

    // Fill remainder with most-played albums, then random (no tracks in fallback)
    if (result.length < MAX_ITEMS) {
      const byPlayCount = Object.entries(albumPlayCounts)
        .filter(([, count]) => count > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([id]) => albumsById.get(id))
        .filter((a): a is Album => !!a && !usedIds.has(`album:${a.id}`));

      for (const data of byPlayCount) {
        if (result.length >= MAX_ITEMS) break;
        usedIds.add(`album:${data.id}`);
        result.push({ kind: 'album', data, ts: 0 });
      }

      if (result.length < MAX_ITEMS) {
        const random = shuffleArray(albums.filter(a => !usedIds.has(`album:${a.id}`)));
        for (const data of random) {
          if (result.length >= MAX_ITEMS) break;
          result.push({ kind: 'album', data, ts: 0 });
        }
      }
    }

    return result;
  }, [
    albumLastPlayedAt, artistLastPlayedAt, songLastPlayedAt,
    albumPlayCounts, artistPlayCounts, songPlayCounts,
    playlistPlayCounts, playlistLastPlayedAt,
    albumsById, artistsById, songsById, albums, playlists,
  ]);
}
