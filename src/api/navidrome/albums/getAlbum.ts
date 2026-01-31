import { Album, ArtistBase, CoverSource, Song } from "@/types";
import { getArtist } from "../artists/getArtist";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export type GetAlbumResult = Album | null;

export async function getAlbum(
  serverUrl: string,
  username: string,
  password: string,
  albumId: string
): Promise<GetAlbumResult> {
  const url =
    `${serverUrl}/rest/getAlbum.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json` +
    `&id=${albumId}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Navidrome getAlbum failed: ${res.status}`);

  const raw = await res.json();
  const album = raw?.["subsonic-response"]?.album;
  if (!album) return null;

  const artist: ArtistBase | null = await getArtist(serverUrl, username, password, album.artistId);
  if (!artist) return null;

  const cover: CoverSource = album.coverArt
    ? { kind: "navidrome", coverArtId: album.coverArt }
    : { kind: "none" };

  const songs: Song[] = (album.song || []).map((s: any) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    artistId: s.artistId,
    duration: s.duration,
    cover,
    albumId: album.id,
    streamUrl:
      `${serverUrl}/rest/stream.view?id=${s.id}&u=${encodeURIComponent(
        username
      )}&p=${encodeURIComponent(password)}&v=${API_VERSION}&c=${CLIENT_NAME}`,
  }));

  return {
    id: album.id,
    cover,
    title: album.name,
    subtext:
      songs.length > 1
        ? `Album • ${artist.name}`
        : `Single • ${artist.name}`,
    artist,
    year: album.year,
    genres: album.genre ? [album.genre] : [],
    created: album.created ? new Date(album.created) : new Date(0),
    songs,
  };
}