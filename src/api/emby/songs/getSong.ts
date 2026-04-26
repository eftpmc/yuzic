import { Song } from "@/types";
import type { EmbyClient } from "../client";
import { normalizeGenres } from "../utils/normalizeGenres";

export async function getSong(
  client: EmbyClient,
  songId: string
): Promise<Song | null> {
  try {
    const path =
      `/Users/${client.userId}/Items` +
      `?Ids=${encodeURIComponent(songId)}` +
      `&Fields=RunTimeTicks,ArtistItems,AlbumId,MediaSources,Genres,PremiereDate,DateCreated`;

    const raw = await client.request<any>(path);
    const i = raw?.Items?.[0];
    if (!i || i.Type !== "Audio") return null;

    const artistItem = i.ArtistItems?.[0];
    const ms = i.MediaSources?.[0];
    const audioStream = ms?.MediaStreams?.find((m: any) => m.Type === "Audio");
    return {
      id: i.Id,
      title: i.Name ?? "Unknown",
      artist: artistItem?.Name ?? "Unknown Artist",
      artistId: artistItem?.Id ?? "",
      albumId: i.AlbumId ?? "",
      cover: i.Id
        ? { kind: "emby", itemId: i.Id }
        : { kind: "none" },
      duration: String(Math.floor((i.RunTimeTicks ?? 0) / 10_000_000)),
      streamUrl: client.buildStreamUrl(i.Id),
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
    console.error("Failed to fetch Emby song:", error);
    return null;
  }
}
