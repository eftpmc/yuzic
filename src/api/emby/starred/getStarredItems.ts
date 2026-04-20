import { Song } from "@/types";
import type { EmbyClient } from "../client";
import { normalizeGenres } from "../utils/normalizeGenres";

export interface GetStarredItemsResult {
  songs: Song[];
}

async function fetchGetStarredSongs(client: EmbyClient) {
  const path =
    `/Users/${client.userId}/Items` +
    `?Recursive=true` +
    `&Filters=IsFavorite` +
    `&IncludeItemTypes=Audio` +
    `&Fields=Id,Name,Artists,AlbumId,RunTimeTicks,ImageTags,MediaSources,Genres,PremiereDate,DateCreated`;
  return client.request<any>(path);
}

function normalizeStarred(raw: any, client: EmbyClient): GetStarredItemsResult {
  const items = raw?.Items ?? [];

  const songs: Song[] = items.map((i: any) => {
    const ms = i.MediaSources?.[0];
    const audioStream = ms?.MediaStreams?.find((m: any) => m.Type === "Audio");
    return {
      id: i.Id,
      title: i.Name,
      artist: i.ArtistItems?.[0]?.Name ?? "Unknown Artist",
      artistId: i.ArtistItems?.[0]?.Id ?? "",
      albumId: i.AlbumId ?? "",
      cover: (i.AlbumId && i.AlbumPrimaryImageTag)
        ? { kind: "emby", itemId: i.AlbumId, tag: i.AlbumPrimaryImageTag }
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
  });

  return { songs };
}

export async function getStarredItems(
  client: EmbyClient
): Promise<GetStarredItemsResult> {
  try {
    const raw = await fetchGetStarredSongs(client);
    return normalizeStarred(raw, client);
  } catch (error) {
    console.error("Failed to fetch Emby starred items:", error);
    return { songs: [] };
  }
}
