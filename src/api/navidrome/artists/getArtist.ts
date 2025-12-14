import { ArtistData } from "@/types";
import { buildCoverArtUrl } from "@/utils/urlBuilders";
import { getArtistInfo } from "@/api/lastfm/getArtistInfo";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export type GetArtistResult = ArtistData | null;

export async function getArtist(
  serverUrl: string,
  username: string,
  password: string,
  artistId: string
): Promise<GetArtistResult> {
  const url =
    `${serverUrl}/rest/getArtist.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json` +
    `&id=${artistId}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Navidrome getArtist failed: ${res.status}`);

  const raw = await res.json();
  const artist = raw?.["subsonic-response"]?.artist;
  if (!artist) return null;

  const lastFmData = await getArtistInfo(artist.name);
  if (!lastFmData) return null;

  const ownedIds = []

  for (const album of artist.album) {
    ownedIds.push(album.id);
  }

  const cover = buildCoverArtUrl(artist.coverArt, serverUrl, username, password);

  return {
    id: artist.id ?? "",
    name: artist.name ?? "Unknown Artist",
    cover,
    subtext: "Artist",
    bio: lastFmData.bio,
    ownedIds,
    externalAlbums: lastFmData.albums
  };
}