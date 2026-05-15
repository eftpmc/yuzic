import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/utils/redux/store";

const PREFIX = (serverId: string) => `${serverId}:`;

function filterByServer<T>(map: Record<string, T>, serverId: string | null): Record<string, T> {
  if (!serverId) return {};
  const prefix = PREFIX(serverId);
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(map)) {
    if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
  }
  return out;
}

export const selectSongPlays = (state: RootState) => state.stats.songPlays;
export const selectAlbumPlays = (state: RootState) => state.stats.albumPlays;
export const selectArtistPlays = (state: RootState) => state.stats.artistPlays;

export const selectSongLastPlayedAt = createSelector(
  [
    (s: RootState) => s.stats.songLastPlayedAt,
    (s: RootState) => s.stats.serverSongLastPlayedAt,
    (s: RootState) => s.servers.activeServerId,
  ],
  (localMap, serverMap, serverId) => {
    const local = filterByServer(localMap, serverId);
    const server = filterByServer(serverMap, serverId);
    const merged: Record<string, number> = { ...server };
    for (const [id, ts] of Object.entries(local)) {
      merged[id] = Math.max(merged[id] ?? 0, ts);
    }
    return merged;
  }
);

export const selectSongPlayCounts = createSelector(
  [
    (s: RootState) => s.stats.songPlays,
    (s: RootState) => s.stats.serverSongPlays,
    (s: RootState) => s.servers.activeServerId,
  ],
  (localMap, serverMap, serverId) => {
    const local = filterByServer(localMap, serverId);
    const server = filterByServer(serverMap, serverId);
    const merged: Record<string, number> = { ...server };
    for (const [id, count] of Object.entries(local)) {
      merged[id] = (merged[id] ?? 0) + count;
    }
    return merged;
  }
);

export const selectAlbumLastPlayedAt = createSelector(
  [
    (s: RootState) => s.stats.albumLastPlayedAt,
    (s: RootState) => s.stats.serverAlbumLastPlayedAt,
    (s: RootState) => s.servers.activeServerId,
  ],
  (localMap, serverMap, serverId) => {
    const local = filterByServer(localMap, serverId);
    const server = filterByServer(serverMap, serverId);
    const merged: Record<string, number> = { ...server };
    for (const [id, ts] of Object.entries(local)) {
      merged[id] = Math.max(merged[id] ?? 0, ts);
    }
    return merged;
  }
);

export const selectAlbumPlayCounts = createSelector(
  [
    (s: RootState) => s.stats.albumPlays,
    (s: RootState) => s.stats.serverAlbumPlays,
    (s: RootState) => s.servers.activeServerId,
  ],
  (localMap, serverMap, serverId) => {
    const local = filterByServer(localMap, serverId);
    const server = filterByServer(serverMap, serverId);
    const merged: Record<string, number> = { ...server };
    for (const [id, count] of Object.entries(local)) {
      merged[id] = (merged[id] ?? 0) + count;
    }
    return merged;
  }
);

export const selectArtistLastPlayedAt = createSelector(
  [(s: RootState) => s.stats.artistLastPlayedAt, (s: RootState) => s.servers.activeServerId],
  (map, serverId) => filterByServer(map, serverId)
);

export const selectArtistPlayCounts = createSelector(
  [(s: RootState) => s.stats.artistPlays, (s: RootState) => s.servers.activeServerId],
  (map, serverId) => filterByServer(map, serverId)
);

export const selectPlaylistPlayCounts = createSelector(
  [(s: RootState) => s.stats.playlistPlays, (s: RootState) => s.servers.activeServerId],
  (map, serverId) => filterByServer(map, serverId)
);

export const selectPlaylistLastPlayedAt = createSelector(
  [(s: RootState) => s.stats.playlistLastPlayedAt, (s: RootState) => s.servers.activeServerId],
  (map, serverId) => filterByServer(map, serverId)
);

export const selectSongPlayCount =
  (songId: string) =>
  (state: RootState): number => {
    const serverId = state.servers.activeServerId;
    if (!serverId) return 0;
    const local = state.stats.songPlays[`${serverId}:${songId}`] ?? 0;
    const server = state.stats.serverSongPlays[`${serverId}:${songId}`] ?? 0;
    return server + local;
  };

export const selectAlbumPlayCount =
  (albumId: string) =>
  (state: RootState): number => {
    const serverId = state.servers.activeServerId;
    if (!serverId) return 0;
    const local = state.stats.albumPlays[`${serverId}:${albumId}`] ?? 0;
    const server = state.stats.serverAlbumPlays[`${serverId}:${albumId}`] ?? 0;
    return server + local;
  };

export const selectArtistPlayCount =
  (artistId: string) =>
  (state: RootState): number => {
    const serverId = state.servers.activeServerId;
    if (!serverId) return 0;
    return state.stats.artistPlays[`${serverId}:${artistId}`] ?? 0;
  };


export const selectArtistLastPlayedAtById =
  (artistId: string) =>
  (state: RootState): number => {
    const serverId = state.servers.activeServerId;
    if (!serverId) return 0;
    return state.stats.artistLastPlayedAt[`${serverId}:${artistId}`] ?? 0;
  };