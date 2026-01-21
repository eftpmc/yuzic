import { Playlist, Song } from "@/types";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export type GetPlaylistResult = Playlist | null;

export async function getPlaylist(
  serverUrl: string,
  username: string,
  password: string,
  playlistId: string
): Promise<GetPlaylistResult> {
  const url =
    `${serverUrl}/rest/getPlaylist.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json` +
    `&id=${playlistId}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Navidrome getPlaylist failed: ${res.status}`);

  const raw = await res.json();
  const playlist = raw?.["subsonic-response"]?.playlist;
  if (!playlist) return null;

  const entries = playlist.entry || [];

  const songs: Song[] = entries.map((s: any) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    duration: s.duration,
    cover: s.coverArt
      ? { kind: "navidrome", coverArtId: s.coverArt }
      : { kind: "none" },
    albumId: s.albumId,
    streamUrl:
      `${serverUrl}/rest/stream.view?id=${s.id}&u=${encodeURIComponent(
        username
      )}&p=${encodeURIComponent(password)}&v=${API_VERSION}&c=${CLIENT_NAME}`
  }));

  return {
    id: playlist.id,
    cover: playlist.coverArt
      ? { kind: "navidrome", coverArtId: playlist.coverArt }
      : { kind: "none" },
    title: playlist.name ?? "Playlist",
    subtext: `Playlist • ${songs.length} songs`,
    changed: new Date(playlist.changed),
    created: new Date(playlist.created),
    songs
  };
}