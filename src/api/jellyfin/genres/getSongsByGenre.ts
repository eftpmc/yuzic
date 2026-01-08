import { Song } from "@/types";
import { buildJellyfinStreamUrl } from "@/utils/builders/buildStreamUrls";

export type GetSongsByGenreResult = Song[];

async function fetchGetSongsByGenre(
  serverUrl: string,
  token: string,
  genre: string
) {
  const url =
    `${serverUrl}/Items` +
    `?IncludeItemTypes=Audio` +
    `&Genres=${encodeURIComponent(genre)}` +
    `&Fields=MediaSources,RunTimeTicks,Genres,Album,AlbumArtist,Artists,UserData,PlayCount`;

  const res = await fetch(url, {
    headers: {
      "X-Emby-Token": token,
      "X-Emby-Authorization":
        `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0", Token="${token}"`
    }
  });

  if (!res.ok) throw new Error(`Jellyfin getSongsByGenre failed: ${res.status}`);
  return res.json();
}

function normalizeGenreSongEntry(
  s: any,
  serverUrl: string,
  token: string
): Song {
  const ticks =
    s.RunTimeTicks ??
    s.MediaSources?.[0]?.RunTimeTicks ??
    0;

  const cover =
    `${serverUrl}/Items/${s.Id}/Images/Primary?quality=90&X-Emby-Token=${token}` +
    (s.ImageTags?.Primary ? `&tag=${s.ImageTags.Primary}` : "");

  return {
    id: s.Id,
    title: s.Name,
    artist: s.AlbumArtist || s.Artists?.[0] || "Unknown Artist",
    cover,
    duration: String(Math.round(Number(ticks) / 10_000_000)),
    streamUrl: buildJellyfinStreamUrl(serverUrl, token, s.Id),
    albumId: s.AlbumId,
    userPlayCount: s.UserData?.PlayCount ?? 0
  };
}

export async function getSongsByGenre(
  serverUrl: string,
  token: string,
  genre: string
): Promise<GetSongsByGenreResult> {
  const raw = await fetchGetSongsByGenre(serverUrl, token, genre);
  const items = raw?.Items ?? [];
  return items.map((s: any) =>
    normalizeGenreSongEntry(s, serverUrl, token)
  );
}