import { Album, Song } from "@/types";
import { buildJellyfinStreamUrl } from "@/utils/builders/buildStreamUrls";

export type GetAlbumSongsResult = Song[];

function normalizeSongEntry(
  s: any,
  album: Album,
  serverUrl: string,
  token: string
): Song {
  const ticks = s.RunTimeTicks ?? 0;
  const artistItem = s.ArtistItems?.[0];

  return {
    id: s.Id,
    title: s.Name,
    artist: artistItem?.Name ?? "Unknown Artist",
    artistId: artistItem?.Id ?? album.artist?.id ?? "",
    cover: album.cover,
    duration: String(Math.round(Number(ticks) / 10_000_000)),
    streamUrl: buildJellyfinStreamUrl(serverUrl, token, s.Id),
    albumId: album.id
  };
}

export async function getAlbumSongs(
  serverUrl: string,
  token: string,
  album: Album,
): Promise<GetAlbumSongsResult> {
  const url =
    `${serverUrl}/Items` +
    `?ParentId=${encodeURIComponent(album.id)}` +
    `&IncludeItemTypes=Audio` +
    `&Recursive=true` +
    `&SortBy=IndexNumber` +
    `&Fields=RunTimeTicks,ArtistItems`;

  const res = await fetch(url, {
    headers: {
      "X-Emby-Token": token,
      "X-Emby-Authorization":
        `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0", Token="${token}"`
    }
  });

  if (!res.ok) throw new Error(`Jellyfin getAlbumSongs failed: ${res.status}`);
  const raw = await res.json();
  const items = raw?.Items ?? [];

  return items.map((s: any) =>
    normalizeSongEntry(
      s,
      album,
      serverUrl,
      token
    )
  );
}