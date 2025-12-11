import { SongData } from "@/types";
import { buildJellyfinStreamUrl } from "@/utils/urlBuilders";

export type GetAlbumSongsResult = SongData[];

async function fetchGetAlbumSongs(
  serverUrl: string,
  token: string,
  albumId: string
) {
  const url =
    `${serverUrl}/Items` +
    `?ParentId=${albumId}` +
    `&IncludeItemTypes=Audio` +
    `&Recursive=true` +
    `&SortBy=IndexNumber` +
    `&Fields=MediaSources,RunTimeTicks,Genres,Album,AlbumArtist,Artists,UserData,PlayCount`;

  const res = await fetch(url, {
    headers: {
      "X-Emby-Token": token,
      "X-Emby-Authorization":
        `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0", Token="${token}"`
    }
  });

  if (!res.ok) throw new Error(`Jellyfin getAlbumSongs failed: ${res.status}`);
  return res.json();
}


function normalizeSongEntry(
  s: any,
  albumId: string,
  cover: string,
  serverUrl: string,
  token: string
): SongData {
  const ticks =
    s.RunTimeTicks ??
    s.MediaSources?.[0]?.RunTimeTicks ??
    0;

  return {
    id: s.Id,
    title: s.Name,
    artist: s.AlbumArtist || s.Artists?.[0] || "Unknown Artist",
    cover,
    duration: String(Math.round(Number(ticks) / 10_000_000)),
    streamUrl: buildJellyfinStreamUrl(serverUrl, token, s.Id),
    albumId,
    genres: s.Genres || [],
    globalPlayCount: s.PlayCount ?? 0,
    userPlayCount: s.UserData?.PlayCount ?? 0,
  };
}

export async function getAlbumSongs(
  serverUrl: string,
  token: string,
  albumId: string,
  cover?: string
): Promise<GetAlbumSongsResult> {
  const raw = await fetchGetAlbumSongs(serverUrl, token, albumId);
  const items = raw?.Items ?? [];

  return items.map((s: any) =>
    normalizeSongEntry(
      s,
      albumId,
      cover ?? "",
      serverUrl,
      token
    )
  );
}