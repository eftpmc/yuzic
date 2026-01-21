import { Album, Artist, CoverSource } from "@/types";
import { getAlbumSongs } from "./getAlbumSongs";
import { getArtist } from "../artists/getArtist";

export type GetAlbumResult = Album | null;

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

async function normalizeAlbum(
  raw: any,
  serverUrl: string,
  token: string
): Promise<Album | null> {
  const a = raw?.Items?.[0];
  if (!a) return null;

  const cover: CoverSource = a.Id
    ? { kind: "jellyfin", itemId: a.Id }
    : { kind: "none" };

  const artist: Artist | null = await getArtist(serverUrl, token, a.ArtistItems[0].Id)
  if (!artist) return null;

  return {
    id: a.Id,
    cover,
    title: a.Name,
    subtext: "",
    artist,
    year: a.ProductionYear,
    songs: [],
    genres: (a.Genres ?? [])
      .flatMap((g: string) => g.split(";"))
      .map((g: string) => g.trim())
      .filter(Boolean)
  };
}

export async function getAlbum(
  serverUrl: string,
  token: string,
  albumId: string
): Promise<GetAlbumResult> {
  const raw = await fetchGetAlbum(serverUrl, token, albumId);
  const base = await normalizeAlbum(raw, serverUrl, token);
  if (!base) return null;

  const songs = await getAlbumSongs(serverUrl, token, base);

  return {
    ...base,
    subtext:
      songs.length > 1
        ? `Album • ${base.artist.name}`
        : `Single • ${base.artist.name}`,
    songs,
  };
}