import { Album, Song } from "@/types";
import type { EmbyClient } from "../client";
import { normalizeGenres } from "../utils/normalizeGenres";

export type GetAlbumSongsResult = Song[];

function normalizeSongEntry(
  s: any,
  album: Album,
  client: EmbyClient
): Song {
  const ticks = s.RunTimeTicks ?? 0;
  const artistItem = s.ArtistItems?.[0];
  const ms = s.MediaSources?.[0];
  const audioStream = ms?.MediaStreams?.find((m: any) => m.Type === "Audio");

  return {
    id: s.Id,
    title: s.Name,
    artist: artistItem?.Name ?? "Unknown Artist",
    artistId: artistItem?.Id ?? album.artist?.id ?? "",
    cover: album.cover,
    duration: String(Math.round(Number(ticks) / 10_000_000)),
    streamUrl: client.buildStreamUrl(s.Id),
    albumId: album.id,
    albumTitle: album.title,
    bitrate: (audioStream?.BitRate ?? ms?.Bitrate) ?? undefined,
    sampleRate: audioStream?.SampleRate ?? undefined,
    bitsPerSample: audioStream?.BitDepth ?? undefined,
    mimeType: ms?.Container ? `audio/${ms.Container}` : undefined,
    dateReleased: s.PremiereDate ?? undefined,
    disc: s.ParentIndexNumber ?? undefined,
    trackNumber: s.IndexNumber ?? undefined,
    dateAdded: s.DateCreated ?? undefined,
    genres: normalizeGenres(s.Genres),
  };
}

export async function getAlbumSongs(
  client: EmbyClient,
  album: Album
): Promise<GetAlbumSongsResult> {
  const path =
    `/Items` +
    `?ParentId=${encodeURIComponent(album.id)}` +
    `&IncludeItemTypes=Audio` +
    `&Recursive=true` +
    `&SortBy=IndexNumber` +
    `&Fields=RunTimeTicks,ArtistItems,MediaSources,Genres,PremiereDate,DateCreated`;
  const raw = await client.request<any>(path);
  const items = raw?.Items ?? [];
  return items.map((s: any) => normalizeSongEntry(s, album, client));
}
