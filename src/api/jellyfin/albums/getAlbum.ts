import { Album, ArtistBase, CoverSource } from "@/types";
import { getAlbumSongs } from "./getAlbumSongs";

export type GetAlbumResult = Album | null;

async function fetchGetAlbum(
  serverUrl: string,
  token: string,
  albumId: string
) {
  const url =
    `${serverUrl}/Items` +
    `?Ids=${encodeURIComponent(albumId)}` +
    `&IncludeItemTypes=MusicAlbum` +
    `&Fields=Genres,ArtistItems,PrimaryImageTag,DateCreated`;

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

function normalizeAlbum(raw: any): Album | null {
  const a = raw?.Items?.[0];
  if (!a) return null;

  const artistItem = a.ArtistItems?.[0];
  if (!artistItem) return null;

  const cover: CoverSource = a.Id
    ? { kind: "jellyfin", itemId: a.Id }
    : { kind: "none" };

  const artist: ArtistBase = {
    id: artistItem.Id,
    name: artistItem.Name ?? "Unknown Artist",
    cover: artistItem.Id
      ? { kind: "jellyfin", itemId: artistItem.Id }
      : { kind: "none" },
    subtext: "Artist"
  };

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
      .filter(Boolean),
    created: a.DateCreated ? new Date(a.DateCreated) : new Date(0),
  };
}

export async function getAlbum(
  serverUrl: string,
  token: string,
  albumId: string
): Promise<GetAlbumResult> {
  const raw = await fetchGetAlbum(serverUrl, token, albumId);
  const base = normalizeAlbum(raw);
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