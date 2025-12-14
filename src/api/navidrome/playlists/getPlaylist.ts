import { PlaylistData, SongData, ArtistData } from "@/types";
import { buildCoverArtUrl } from "@/utils/urlBuilders";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export type GetPlaylistResult = PlaylistData | null;

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

  const songs: SongData[] = entries.map((s: any) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    duration: s.duration,
    cover: buildCoverArtUrl(s.coverArt, serverUrl, username, password),
    albumId: s.albumId,
    userPlayCount: 0,
    streamUrl:
      `${serverUrl}/rest/stream.view?id=${s.id}&u=${encodeURIComponent(
        username
      )}&p=${encodeURIComponent(password)}&v=${API_VERSION}&c=${CLIENT_NAME}`
  }));

  return {
    id: playlist.id,
    cover: buildCoverArtUrl(playlist.coverArt, serverUrl, username, password),
    title: playlist.name ?? "Playlist",
    subtext: `Playlist • ${songs.length} songs`,
    songs,
    songCount: playlist.songcount
  };
}