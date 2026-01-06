import { CoverSource, PlaylistBase } from "@/types";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export type GetPlaylistsResult = PlaylistBase[];

export async function getPlaylists(
  serverUrl: string,
  username: string,
  password: string
): Promise<GetPlaylistsResult> {
  const url =
    `${serverUrl}/rest/getPlaylists.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json` +
    `&size=500`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Navidrome getPlaylists failed: ${res.status}`);

  const raw = await res.json();
  const list = raw?.["subsonic-response"]?.playlists?.playlist || [];

  return list.map((pl: any) => {
      const cover: CoverSource = pl.coverArt
      ? { kind: "navidrome", coverArtId: pl.coverArt }
      : { kind: "none" };

    return {
      id: pl.id,
      cover,
      title: pl.name ?? "Playlist",
      subtext: "Playlist",
      songs: [],
      songCount: pl.songCount
    };
  });
}