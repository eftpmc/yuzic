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
  const albumId = a.Id;
  const artistName = a.AlbumArtist || a.Artists?.[0] || "Unknown Artist";

  const cover =
    `${serverUrl}/Items/${albumId}/Images/Primary?quality=90&X-Emby-Token=${token}` +
    (a.ImageTags?.Primary ? `&tag=${a.ImageTags.Primary}` : "");

  const songItems = await getAlbumSongs(serverUrl, token, albumId, cover);

  const songs: SongData[] = songItems.map((s: SongData) => ({
    ...s,
    albumId,
    cover,
  }));

  const artist: ArtistData = {
    id: a.AlbumArtistId || a.ArtistItems?.[0]?.Id || "",
    name: artistName,
    cover,
  };

  return {
    id: albumId,
    cover,
    title: a.Name ?? "Unknown Album",
    subtext:
      songs.length > 1
        ? `Album • ${artistName}`
        : `Single • ${artistName}`,
    artist,
    songs,
    genres: a.Genres || [],
    musicBrainzId: null,
    lastFmUrl: null,
    userPlayCount: songs.reduce(
      (sum, s) => sum + (s.userPlayCount || 0),
      0
    ),
  };
}

export async function getAlbums(
  serverUrl: string,
  token: string
): Promise<GetAlbumsResult> {
  const raw = await fetchGetAlbums(serverUrl, token);
  const items = raw?.Items ?? [];
  const albums = await Promise.all(
    items.map((a: any) => normalizeAlbum(a, serverUrl, token))
  );

  return albums.filter(Boolean) as AlbumData[];
}