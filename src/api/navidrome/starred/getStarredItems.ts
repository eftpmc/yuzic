import { Song } from "@/types";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export interface GetStarredItemsResult {
  songs: Song[];
}

export async function getStarredItems(
  serverUrl: string,
  username: string,
  password: string
): Promise<GetStarredItemsResult> {
  const url =
    `${serverUrl}/rest/getStarred.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json`;

  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Navidrome getStarred failed: ${res.status}`);

  const raw = await res.json();

  const starred = raw?.["subsonic-response"]?.starred || {};

  return {
    songs: (starred.song || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      albumId: s.albumId,
      cover: s.coverArt
            ? { kind: "navidrome", coverArtId: s.coverArt }
            : { kind: "none" },
      duration: s.duration,
      streamUrl:
        `${serverUrl}/rest/stream.view?id=${s.id}&u=${encodeURIComponent(
          username
        )}&p=${encodeURIComponent(password)}&v=${API_VERSION}&c=${CLIENT_NAME}`,
    })),
  };
}