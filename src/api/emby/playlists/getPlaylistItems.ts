import { CoverSource, Song } from "@/types";
import type { EmbyClient } from "../client";
import { normalizeGenres } from "../utils/normalizeGenres";

export type GetPlaylistItemsResult = Song[];

async function fetchGetPlaylistItems(
  client: EmbyClient,
  playlistId: string
) {
  const path = `/Playlists/${playlistId}/Items?userId=${client.userId}`;
  return client.request<any>(path);
}

function normalizePlaylistSongEntry(s: any, client: EmbyClient): Song {
  const ticks =
    s.RunTimeTicks ??
    s.MediaSources?.[0]?.RunTimeTicks ??
    0;

  const albumTag: string | undefined = s.AlbumPrimaryImageTag ?? undefined;
  const cover: CoverSource = (s.AlbumId && albumTag)
    ? { kind: "emby", itemId: s.AlbumId, tag: albumTag }
    : { kind: "none" };

  const ms = s.MediaSources?.[0];
  const audioStream = ms?.MediaStreams?.find((m: any) => m.Type === "Audio");

  return {
    id: s.Id,
    title: s.Name,
    artist: s.ArtistItems?.[0]?.Name || "Unknown Artist",
    artistId: s.ArtistItems?.[0]?.Id ?? "",
    cover,
    duration: String(Math.round(Number(ticks) / 10_000_000)),
    streamUrl: client.buildStreamUrl(s.Id),
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
  client: EmbyClient,
  playlistId: string
): Promise<GetPlaylistItemsResult> {
  const raw = await fetchGetPlaylistItems(client, playlistId);
  const items = raw?.Items ?? [];
  return items.map((s: any) => normalizePlaylistSongEntry(s, client));
}

/** Resolve song ID to Emby PlaylistItemId (required for remove). */
export async function getPlaylistEntryIdForSong(
  client: EmbyClient,
  playlistId: string,
  songId: string
): Promise<string | null> {
  const raw = await fetchGetPlaylistItems(client, playlistId);
  const items = raw?.Items ?? [];
  const item = items.find((s: any) => s.Id === songId);
  return item?.PlaylistItemId ?? null;
}
