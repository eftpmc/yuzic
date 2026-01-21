import { CoverSource, Song } from "@/types";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export type GetSongsByGenreResult = Song[];

async function fetchGetSongsByGenre(
  serverUrl: string,
  username: string,
  password: string,
  genre: string,
  count: number
) {
  const url =
    `${serverUrl}/rest/getSongsByGenre.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json` +
    `&genre=${encodeURIComponent(genre)}` +
    `&count=${count}`;

  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Navidrome getSongsByGenre failed: ${res.status}`);

  return res.json();
}

function normalizeSongsByGenre(
  raw: any,
  serverUrl: string,
  username: string,
  password: string
): GetSongsByGenreResult {
  const list = raw?.["subsonic-response"]?.songsByGenre?.song || [];

  return list.map((s: any) => {

    const cover: CoverSource = s.coverArt
        ? { kind: "navidrome", coverArtId: s.coverArt }
        : { kind: "none" };

    return {
      id: s.id,
      title: s.title,
      artist: s.artist,
      artistId: s.artistId,
      duration: s.duration,
      cover,
      albumId: s.albumId,
      streamUrl:
        `${serverUrl}/rest/stream.view?id=${s.id}&u=${encodeURIComponent(
          username
        )}&p=${encodeURIComponent(
          password
        )}&v=${API_VERSION}&c=${CLIENT_NAME}`,
    };
  });
}

export async function getSongsByGenre(
  serverUrl: string,
  username: string,
  password: string,
  genre: string,
  count: number = 500
): Promise<GetSongsByGenreResult> {
  const raw = await fetchGetSongsByGenre(
    serverUrl,
    username,
    password,
    genre,
    count
  );
  return normalizeSongsByGenre(raw, serverUrl, username, password);
}