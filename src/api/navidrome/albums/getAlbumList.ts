import { AlbumBase, ArtistBase, CoverSource } from "@/types";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export type GetAlbumListResult = AlbumBase[];

async function fetchGetAlbumList(
  serverUrl: string,
  username: string,
  password: string,
  type: string = "newest",
  size: number = 500
) {
  const url =
    `${serverUrl}/rest/getAlbumList.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json&type=${type}&size=${size}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Navidrome getAlbumList failed: ${res.status}`);

  return res.json();
}

function normalizeAlbumEntry(
  a: any,
  serverUrl: string,
  username: string,
  password: string
): AlbumBase {
  const cover: CoverSource =
  a.coverArt
    ? { kind: 'navidrome', coverArtId: a.coverArt }
    : { kind: 'none' };

  const artist: ArtistBase = {
    id: a.artistId,
    cover: { kind: "none" },
    name: a.artist,
    subtext: "Artist",
  }

  return {
    id: a.id,
    cover,
    title: a.title,
    subtext:
      a.songCount > 1
        ? `Album • ${a.artist}`
        : `Single • ${a.artist}`,
    artist,
    year: a.year,
    genres: a.genre ? [a.genre] : [],
  };
}

export async function getAlbumList(
  serverUrl: string,
  username: string,
  password: string,
  type: string = "newest",
  size: number = 500
): Promise<GetAlbumListResult> {
  const raw = await fetchGetAlbumList(serverUrl, username, password, type, size);
  const albums = raw?.["subsonic-response"]?.albumList?.album ?? [];

  return albums.map((a: any) => normalizeAlbumEntry(a, serverUrl, username, password));
}