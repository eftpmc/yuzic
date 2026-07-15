import { Song } from "@/types";
import type { MediaBrowserClient } from "../client";
import { buildSongCover } from "../brand";
import { normalizeGenres } from "../utils/normalizeGenres";
import { MediaBrowserItem, MediaBrowserItemsResponse } from "../types";

export type GetPlaylistItemsResult = Song[];

async function fetchGetPlaylistItems(
  client: MediaBrowserClient,
  playlistId: string
) {
  const path = `/Playlists/${playlistId}/Items?userId=${client.userId}`;
  return client.request<MediaBrowserItemsResponse>(path);
}

function normalizePlaylistSongEntry(s: MediaBrowserItem, client: MediaBrowserClient): Song {
  const ticks =
    s.RunTimeTicks ??
    s.MediaSources?.[0]?.RunTimeTicks ??
    0;

  const cover = buildSongCover(client.brand, s.Id, s.AlbumId, s.AlbumPrimaryImageTag ?? undefined);
  const songId = s.Id ?? "";

  const ms = s.MediaSources?.[0];
  const audioStream = ms?.MediaStreams?.find((m) => m.Type === "Audio");

  return {
    id: songId,
    title: s.Name ?? "Unknown",
    artist: s.ArtistItems?.[0]?.Name || "Unknown Artist",
    artistId: s.ArtistItems?.[0]?.Id ?? "",
    cover,
    duration: String(Math.round(Number(ticks) / 10_000_000)),
    streamUrl: client.buildStreamUrl(songId),
    albumId: s.AlbumId ?? "",
    bitrate: (audioStream?.BitRate ?? ms?.Bitrate) ?? undefined,
    sampleRate: audioStream?.SampleRate ?? undefined,
    bitsPerSample: audioStream?.BitDepth ?? undefined,
    mimeType: ms?.Container ? `audio/${ms.Container}` : undefined,
    dateReleased: s.PremiereDate ?? undefined,
    disc: s.ParentIndexNumber ?? undefined,
    trackNumber: s.IndexNumber ?? undefined,
    dateAdded: s.DateCreated ?? undefined,
    genres: normalizeGenres(s.Genres),
  };
}

export async function getPlaylistItems(
  client: MediaBrowserClient,
  playlistId: string
): Promise<GetPlaylistItemsResult> {
  const raw = await fetchGetPlaylistItems(client, playlistId);
  const items = raw?.Items ?? [];
  return items.map((s) => normalizePlaylistSongEntry(s, client));
}

export async function getPlaylistEntryOrder(
  client: MediaBrowserClient,
  playlistId: string
): Promise<{ songId: string; entryId: string }[]> {
  const raw = await fetchGetPlaylistItems(client, playlistId);
  return (raw?.Items ?? [])
    .filter((item): item is MediaBrowserItem & { Id: string; PlaylistItemId: string } =>
      !!item.Id && !!item.PlaylistItemId
    )
    .map(item => ({ songId: item.Id, entryId: item.PlaylistItemId }));
}

/** Resolve song ID to the server's PlaylistItemId (required for remove). */
export async function getPlaylistEntryIdForSong(
  client: MediaBrowserClient,
  playlistId: string,
  songId: string
): Promise<string | null> {
  const raw = await fetchGetPlaylistItems(client, playlistId);
  const items = raw?.Items ?? [];
  const item = items.find((s) => s.Id === songId);
  return item?.PlaylistItemId ?? null;
}
