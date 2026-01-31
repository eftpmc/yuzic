import { Song } from "@/types";
import { buildJellyfinStreamUrl } from "@/utils/builders/buildStreamUrls";

export async function getSong(
  serverUrl: string,
  userId: string,
  token: string,
  songId: string
): Promise<Song | null> {
  try {
    const url =
      `${serverUrl}/Users/${userId}/Items` +
      `?Ids=${encodeURIComponent(songId)}` +
      `&Fields=RunTimeTicks,ArtistItems,AlbumId`;

    const res = await fetch(url, {
      headers: {
        "X-Emby-Token": token,
        "X-Emby-Authorization":
          `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0", Token="${token}"`,
      },
    });

    if (!res.ok) return null;

    const raw = await res.json();
    const i = raw?.Items?.[0];
    if (!i || i.Type !== "Audio") return null;

    const artistItem = i.ArtistItems?.[0];
    return {
      id: i.Id,
      title: i.Name ?? "Unknown",
      artist: artistItem?.Name ?? "Unknown Artist",
      artistId: artistItem?.Id ?? "",
      albumId: i.AlbumId ?? "",
      cover: i.Id
        ? { kind: "jellyfin", itemId: i.Id }
        : { kind: "none" },
      duration: String(Math.floor((i.RunTimeTicks ?? 0) / 10_000_000)),
      streamUrl: buildJellyfinStreamUrl(serverUrl, token, i.Id),
    };
  } catch (error) {
    console.error("Failed to fetch Jellyfin song:", error);
    return null;
  }
}
