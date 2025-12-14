import { AlbumData, ArtistData, SongData } from "@/types";
import { getAlbumSongs } from "./getAlbumSongs";
import { buildJellyfinStreamUrl } from "@/utils/urlBuilders";

export type GetAlbumResult = AlbumData | null;

async function fetchGetAlbum(
  serverUrl: string,
  token: string,
  albumId: string
) {
  const url =
    `${serverUrl}/Items` +
    `?Ids=${albumId}` +
    `&Fields=Genres,AlbumArtist,ArtistItems,Artists,PrimaryImageAspectRatio,PrimaryImageTag`;

  const res = await fetch(url, {
    headers: {
      "X-Emby-Token": token,
      "X-Emby-Authorization":
        `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0", Token="${token}"`
    }
  });

  if (!res.ok) throw new Error(`Jellyfin getAlbum failed: ${res.status}`);
  return res.json();
}

function normalizeAlbum(
  raw: any,
  serverUrl: string,
  token: string
): AlbumData | null {
  const a = raw?.Items?.[0];
  if (!a) return null;

  const cover =
    `${serverUrl}/Items/${a.Id}/Images/Primary?quality=90&X-Emby-Token=${token}` +
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
    id: a.Id,
    cover,
    title: a.Name,
    subtext: `Album • ${artist.name}`,
    artist,
    songs: [],
    songCount: 0,
    userPlayCount: a.UserData.PlayCount,
  };
}

export async function getAlbum(
  serverUrl: string,
  token: string,
  albumId: string
): Promise<GetAlbumResult> {
  const raw = await fetchGetAlbum(serverUrl, token, albumId);
  const base = normalizeAlbum(raw, serverUrl, token);
  if (!base) return null;

  const songs = await getAlbumSongs(serverUrl, token, albumId);

  return {
    ...base,
    subtext:
      songs.length > 1
        ? `Album • ${base.artist.name}`
        : `Single • ${base.artist.name}`,
    songs,
  };
}