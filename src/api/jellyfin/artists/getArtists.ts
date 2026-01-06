import { ArtistBase, CoverSource } from "@/types";

export type GetArtistsResult = ArtistBase[];

export async function getArtists(
  serverUrl: string,
  token: string
): Promise<GetArtistsResult> {
  try {
    const url =
      `${serverUrl}/Items` +
      `?IncludeItemTypes=MusicArtist` +
      `&Recursive=true` +
      `&SortBy=SortName` +
      `&Fields=PrimaryImageTag,Overview,Genres,DateCreated`;

    const res = await fetch(url, {
      headers: {
        "X-Emby-Token": token,
        "X-Emby-Authorization":
          `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0", Token="${token}"`,
      },
    });

    if (!res.ok) throw new Error(`Jellyfin getArtists failed: ${res.status}`);

    const raw = await res.json();
    const items = raw?.Items ?? [];

    return items.map((a: any) => {
      const cover: CoverSource = a.Id
            ? { kind: "jellyfin", itemId: a.Id }
            : { kind: "none" };

      return {
        id: a.Id,
        name: a.Name ?? "Unknown Artist",
        cover,
        subtext: "Artist"
      };
    });
  } catch (error) {
    console.error("Failed to fetch Jellyfin artists:", error);
    return [];
  }
}