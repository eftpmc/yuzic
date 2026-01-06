import { AlbumBase, Artist, ArtistBase, CoverSource } from "@/types";
import { getArtistInfo } from "@/api/lastfm/getArtistInfo";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export type GetArtistResult = Artist | null;

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

  const albums: AlbumBase[] = []

  const artistCover: CoverSource = artist.coverArt
    ? { kind: "navidrome", coverArtId: artist.coverArt }
    : { kind: "none" };

  for (const album of artist.album) {
    const cover: CoverSource = album.coverArt
      ? { kind: "navidrome", coverArtId: album.coverArt }
      : { kind: "none" };

    const artistBase: ArtistBase = {
      id: artist.id,
      cover: artistCover,
      name: artist.name,
      subtext: "Artist"
    }

    const a: AlbumBase = {
      id: album.id,
      title: album.name,
      cover,
      subtext: `Album • ${artist.name}`,
      artist: artistBase,
      userPlayCount: 0
    }

    albums.push(a);
  }

  return {
    id: artist.id,
    name: artist.name,
    cover: artistCover,
    subtext: "Artist",
    bio: lastFmData.bio,
    lastfmurl: lastFmData.artistUrl,
    ownedAlbums: albums,
    externalAlbums: lastFmData.albums
  };
}