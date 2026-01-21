import { Song } from "@/types";
import { buildJellyfinStreamUrl } from "@/utils/builders/buildStreamUrls";

export interface GetStarredItemsResult {
  songs: Song[];
}

async function fetchGetStarredSongs(
  serverUrl: string,
  userId: string,
  token: string
) {
  const url =
    `${serverUrl}/Users/${userId}/Items` +
    `?Recursive=true` +
    `&Filters=IsFavorite` +
    `&IncludeItemTypes=Audio` +
    `&Fields=Id,Name,Artists,AlbumId,RunTimeTicks,ImageTags`;

  const res = await fetch(url, {
    headers: {
      "X-Emby-Token": token,
      "X-Emby-Authorization":
        `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0", Token="${token}"`
    }
  });

  if (!res.ok) {
    throw new Error(`Jellyfin getStarred failed: ${res.status}`);
  }

  return res.json();
}

function normalizeStarred(
  raw: any,
  serverUrl: string,
  token: string
): GetStarredItemsResult {
  const items = raw?.Items ?? [];

  const songs: Song[] = items.map((i: any) => ({
    id: i.Id,
    title: i.Name,
    artist: i.ArtistItems?.[0].Name ?? "Unknown Artist",
    albumId: i.AlbumId,
    cover: i.Id
          ? { kind: "jellyfin", itemId: i.Id }
          : { kind: "none" },
    duration: Math.floor((i.RunTimeTicks ?? 0) / 10_000_000),
    streamUrl: buildJellyfinStreamUrl(serverUrl, token, i.Id)
  }));

  return { songs };
}

export async function getStarredItems(
  serverUrl: string,
  userId: string,
  token: string
): Promise<GetStarredItemsResult> {
  try {
    const raw = await fetchGetStarredSongs(serverUrl, userId, token);
    return normalizeStarred(raw, serverUrl, token);
  } catch (error) {
    console.error("Failed to fetch Jellyfin starred items:", error);
    return { songs: [] };
  }
}