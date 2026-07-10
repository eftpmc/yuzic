import { Song } from "@/types";
import type { MediaBrowserClient } from "../client";
import { buildCover } from "../brand";
import { normalizeGenres } from "../utils/normalizeGenres";
import { MediaBrowserItemsResponse } from "../types";

export async function getSong(
  client: MediaBrowserClient,
  songId: string
): Promise<Song | null> {
  try {
    const path =
      `/Users/${client.userId}/Items` +
      `?Ids=${encodeURIComponent(songId)}` +
      `&Fields=RunTimeTicks,ArtistItems,AlbumId,MediaSources,Genres,PremiereDate,DateCreated`;

    const raw = await client.request<MediaBrowserItemsResponse>(path);
    const i = raw?.Items?.[0];
    if (!i || i.Type !== "Audio") return null;

    const artistItem = i.ArtistItems?.[0];
    const ms = i.MediaSources?.[0];
    const audioStream = ms?.MediaStreams?.find((m) => m.Type === "Audio");
    const id = i.Id ?? "";
    return {
      id,
      title: i.Name ?? "Unknown",
      artist: artistItem?.Name ?? "Unknown Artist",
      artistId: artistItem?.Id ?? "",
      albumId: i.AlbumId ?? "",
      cover: buildCover(client.brand, i.Id),
      duration: String(Math.floor((i.RunTimeTicks ?? 0) / 10_000_000)),
      streamUrl: client.buildStreamUrl(id),
      bitrate: (audioStream?.BitRate ?? ms?.Bitrate) ?? undefined,
      sampleRate: audioStream?.SampleRate ?? undefined,
      bitsPerSample: audioStream?.BitDepth ?? undefined,
      mimeType: ms?.Container ? `audio/${ms.Container}` : undefined,
      dateReleased: i.PremiereDate ?? undefined,
      disc: i.ParentIndexNumber ?? undefined,
      trackNumber: i.IndexNumber ?? undefined,
      dateAdded: i.DateCreated ?? undefined,
      genres: normalizeGenres(i.Genres),
    };
  } catch (error) {
    console.error(`Failed to fetch ${client.brand.label} song:`, error);
    return null;
  }
}
