import { CoverSource, Song } from "@/types";
import { buildJellyfinStreamUrl } from "@/utils/builders/buildStreamUrls";

export type GetPlaylistItemsResult = Song[];

async function fetchGetPlaylistItems(
  serverUrl: string,
  playlistId: string,
  userId: string,
  token: string
) {
  const url =
    `${serverUrl}/Playlists/${playlistId}/Items` +
    `?userId=${userId}`;

  const res = await fetch(url, {
    headers: {
      "X-Emby-Token": token,
      "X-Emby-Authorization":
        `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0", Token="${token}"`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) throw new Error(`Jellyfin getPlaylistItems failed: ${res.status}`);
  return res.json();
}

function normalizePlaylistSongEntry(
  s: any,
  serverUrl: string,
  token: string
): Song {
  const ticks =
    s.RunTimeTicks ??
    s.MediaSources?.[0]?.RunTimeTicks ??
    0;

  const cover: CoverSource = s.AlbumId
        ? { kind: "jellyfin", itemId: s.AlbumId }
        : { kind: "none" };

  return {
    id: s.Id,
    title: s.Name,
    artist: s.ArtistItems[0].Name || "Unknown Artist",
    artistId: s.ArtistItems[0].Id,
    cover,
    duration: String(Math.round(Number(ticks) / 10_000_000)),
    streamUrl: buildJellyfinStreamUrl(serverUrl, token, s.Id),
    albumId: s.AlbumId
  };
}

export async function getPlaylistItems(
  serverUrl: string,
  playlistId: string,
  userId: string,
  token: string
): Promise<GetPlaylistItemsResult> {
  const raw = await fetchGetPlaylistItems(serverUrl, playlistId, userId, token);
  const items = raw?.Items ?? [];
  return items.map((s: any) => normalizePlaylistSongEntry(s, serverUrl, token));
}