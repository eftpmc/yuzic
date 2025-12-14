import { AlbumData, ArtistData, SongData } from "@/types";
import { getAlbumSongs } from "./getAlbumSongs";
import { buildJellyfinStreamUrl } from "@/utils/urlBuilders";

export type GetAlbumsResult = AlbumData[];

async function fetchGetAlbums(serverUrl: string, token: string) {
  const url =
    `${serverUrl}/Items` +
    `?IncludeItemTypes=MusicAlbum` +
    `&Recursive=true` +
    `&SortBy=SortName` +
    `&Fields=PrimaryImageTag,Genres,AlbumArtist,ArtistItems,Artists`;

  const res = await fetch(url, {
    headers: {
      "X-Emby-Token": token,
      "X-Emby-Authorization":
        `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0", Token="${token}"`
    }
  });

  if (!res.ok) throw new Error(`Jellyfin getAlbums failed: ${res.status}`);
  return res.json();
}

async function normalizeAlbum(
  a: any,
  serverUrl: string,
  token: string
): Promise<AlbumData | null> {
  try {
    const albumId = a.Id;
    if (!albumId) return null;

    const cover =
      `${serverUrl}/Items/${albumId}/Images/Primary?quality=90&X-Emby-Token=${token}` +
      (a.ImageTags?.Primary ? `&tag=${a.ImageTags.Primary}` : "");

    const artist: ArtistData = {
      id: a.AlbumArtists[0].Id,
      name: a.AlbumArtists[0].Name || "Unknown Artist",
      cover: "",
      subtext: "Artist",
      bio: "",
      ownedIds: [],
      externalAlbums: []
    }

    return {
      id: albumId,
      cover,
      title: a.Name ?? "Unknown Album",
      subtext: `Album • ${artist.name}`,
      artist,
      songs: [],
      songCount: 0,
      userPlayCount: a.UserData.PlayCount ?? 0,
    };
  } catch (error) {
    console.error(`Failed to normalize album:`, error);
    return null;
  }
}

export async function getAlbums(
  serverUrl: string,
  token: string
): Promise<GetAlbumsResult> {
  try {
    const raw = await fetchGetAlbums(serverUrl, token);
    const items = raw?.Items ?? [];

    const albums = await Promise.all(
      items.map((a: any) => normalizeAlbum(a, serverUrl, token))
    );

    return albums.filter((a): a is AlbumData => a !== null);
  } catch (error) {
    console.error(`Failed to fetch albums:`, error);
    return [];
  }
}