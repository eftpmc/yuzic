import { ArtistData } from "@/types";
import { getArtist } from "./getArtist";
import { getArtistInfo } from "@/api/lastfm/getArtistInfo";
import { buildCoverArtUrl } from "@/utils/urlBuilders";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export type GetArtistResult = ArtistData;
export type GetArtistsResult = ArtistData[];

async function fetchGetArtists(
  serverUrl: string,
  username: string,
  password: string
) {
  const url =
    `${serverUrl}/rest/getArtists.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Navidrome getArtists failed: ${res.status}`);

  return res.json();
}

async function normalizeArtistEntry(
  a: any,
  serverUrl: string,
  username: string,
  password: string
): Promise<GetArtistResult> {
  const cover = buildCoverArtUrl(a.coverArt, serverUrl, username, password);

  return {
    id: a.id,
    cover,
    name: a.name,
    subtext: "Artist",
    bio: "",
    ownedIds: [],
    externalAlbums: []
  };
}

export async function getArtists(
  serverUrl: string,
  username: string,
  password: string
): Promise<GetArtistsResult> {
  const raw = await fetchGetArtists(serverUrl, username, password);

  const indexes = raw?.["subsonic-response"]?.artists?.index;
  if (!indexes) return [];

  const flattened = indexes.flatMap((bucket: any) => bucket.artist || []);

  const normalized = await Promise.all(
    flattened.map((a: any) =>
      normalizeArtistEntry(a, serverUrl, username, password)
    )
  );

  return normalized;
}