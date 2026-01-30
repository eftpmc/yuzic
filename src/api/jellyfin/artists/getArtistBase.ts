import { ArtistBase, CoverSource } from "@/types";

export type GetArtistBaseResult = ArtistBase | null;

/**
 * Fetches lightweight artist info (id, name, cover, subtext) by ID.
 * Use this when only basic artist data is needed (e.g. for album display),
 * instead of getArtist which fetches all owned albums.
 */
export async function getArtistBase(
  serverUrl: string,
  token: string,
  artistId: string
): Promise<GetArtistBaseResult> {
  try {
    const url =
      `${serverUrl}/Items` +
      `?Ids=${encodeURIComponent(artistId)}` +
      `&IncludeItemTypes=MusicArtist` +
      `&Fields=PrimaryImageTag`;

    const res = await fetch(url, {
      headers: {
        "X-Emby-Token": token,
        "X-Emby-Authorization":
          `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0", Token="${token}"`
      }
    });

    if (!res.ok) throw new Error(`Jellyfin getArtistBase failed: ${res.status}`);

    const raw = await res.json();
    const a = raw?.Items?.[0];
    if (!a) return null;

    const cover: CoverSource = a.Id
      ? { kind: "jellyfin", itemId: a.Id }
      : { kind: "none" };

    return {
      id: a.Id,
      name: a.Name ?? "Unknown Artist",
      cover,
      subtext: "Artist"
    };
  } catch (error) {
    console.error("Failed to fetch Jellyfin artist base:", error);
    return null;
  }
}
