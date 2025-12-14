import { ArtistData } from "@/types";
import { getArtistInfo } from "@/api/lastfm/getArtistInfo";

export type GetArtistsResult = ArtistData[];

async function fetchGetArtists(serverUrl: string, token: string) {
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
  return res.json();
}

function normalizeBaseArtist(a: any, serverUrl: string, token: string): ArtistData {
  const cover =
    `${serverUrl}/Items/${a.Id}/Images/Primary?quality=90&X-Emby-Token=${token}` +
    (a.ImageTags?.Primary ? `&tag=${a.ImageTags.Primary}` : "");

  return {
    id: a.Id,
    name: a.Name ?? "Unknown Artist",
    cover,
    subtext: "Artist",
    bio: "",
    ownedIds: [],
    externalAlbums: []
  };
}

export async function getArtists(
  serverUrl: string,
  token: string
): Promise<GetArtistsResult> {
  try {
    const raw = await fetchGetArtists(serverUrl, token);
    const items = raw?.Items ?? [];

    return items.map((a: any) => normalizeBaseArtist(a, serverUrl, token));
  } catch (error) {
    console.error("Failed to fetch Jellyfin artists:", error);
    return [];
  }
}