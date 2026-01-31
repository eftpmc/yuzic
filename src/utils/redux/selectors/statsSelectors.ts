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
  [(s: RootState) => s.stats.songLastPlayedAt, (s: RootState) => s.servers.activeServerId],
  (map, serverId) => filterByServer(map, serverId)
);

export const selectAlbumLastPlayedAt = createSelector(
  [(s: RootState) => s.stats.albumLastPlayedAt, (s: RootState) => s.servers.activeServerId],
  (map, serverId) => filterByServer(map, serverId)
);

export const selectArtistLastPlayedAt = createSelector(
  [(s: RootState) => s.stats.artistLastPlayedAt, (s: RootState) => s.servers.activeServerId],
  (map, serverId) => filterByServer(map, serverId)
);

export const selectSongPlayCount =
  (songId: string) =>
  (state: RootState): number => {
    const serverId = state.servers.activeServerId;
    if (!serverId) return 0;
    return state.stats.songPlays[`${serverId}:${songId}`] ?? 0;
  };

export const selectAlbumPlayCount =
  (albumId: string) =>
  (state: RootState): number => {
    const serverId = state.servers.activeServerId;
    if (!serverId) return 0;
    return state.stats.albumPlays[`${serverId}:${albumId}`] ?? 0;
  };

export const selectArtistPlayCount =
  (artistId: string) =>
  (state: RootState): number => {
    const serverId = state.servers.activeServerId;
    if (!serverId) return 0;
    return state.stats.artistPlays[`${serverId}:${artistId}`] ?? 0;
  };

export const selectSongLastPlayedAtById =
  (songId: string) =>
  (state: RootState): number => {
    const serverId = state.servers.activeServerId;
    if (!serverId) return 0;
    return state.stats.songLastPlayedAt[`${serverId}:${songId}`] ?? 0;
  };

export const selectAlbumLastPlayedAtById =
  (albumId: string) =>
  (state: RootState): number => {
    const serverId = state.servers.activeServerId;
    if (!serverId) return 0;
    return state.stats.albumLastPlayedAt[`${serverId}:${albumId}`] ?? 0;
  };

export const selectArtistLastPlayedAtById =
  (artistId: string) =>
  (state: RootState): number => {
    const serverId = state.servers.activeServerId;
    if (!serverId) return 0;
    return state.stats.artistLastPlayedAt[`${serverId}:${artistId}`] ?? 0;
  };