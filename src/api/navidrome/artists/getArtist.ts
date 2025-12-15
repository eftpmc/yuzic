import { AlbumBase, Artist, ArtistBase } from "@/types";
import { buildCoverArtUrl } from "@/utils/urlBuilders";
import { getArtistInfo } from "@/api/lastfm/getArtistInfo";
import { getAlbumList } from "../albums/getAlbumList";

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

  const artistCover = buildCoverArtUrl(artist.coverArt, serverUrl, username, password);

  for (const album of artist.album) {
    const cover = buildCoverArtUrl(album.coverArt, serverUrl, username, password);

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
      subtext: `Album • {artist.name}`,
      artist: artistBase,
      userPlayCount: 0
    }

    albums.push(a);
  }

  const cover = buildCoverArtUrl(artist.coverArt, serverUrl, username, password);

  return {
    id: artist.id,
    name: artist.name,
    cover,
    subtext: "Artist",
    bio: lastFmData.bio,
    ownedAlbums: albums,
    externalAlbums: lastFmData.albums
  };
}