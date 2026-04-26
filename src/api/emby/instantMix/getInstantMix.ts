import { CoverSource, Song } from "@/types";
import type { EmbyClient } from "../client";
import { normalizeGenres } from "../utils/normalizeGenres";

export type GetInstantMixResult = Song[];

function parseInstantMixResponse(text: string): { Items?: any[] } {
  const trimmed = text.trim();
  if (trimmed.startsWith("data:")) {
    const commaIdx = trimmed.indexOf(",");
    if (commaIdx >= 0) {
      const decoded = decodeURIComponent(trimmed.slice(commaIdx + 1).trim());
      return JSON.parse(decoded);
    }
  }
  return JSON.parse(trimmed);
}

async function fetchInstantMix(
  client: EmbyClient,
  itemId: string,
  limit = 50
) {
  const path = `/Items/${itemId}/InstantMix?UserId=${client.userId}&Limit=${limit}`;
  const text = await client.requestText(path, {
    headers: { "Content-Type": "application/json" },
  });
  return parseInstantMixResponse(text);
}

function normalizeItem(s: any, client: EmbyClient): Song | null {
  if (!s?.Id || s.Type !== "Audio") return null;

  const ticks = s.RunTimeTicks ?? s.MediaSources?.[0]?.RunTimeTicks ?? 0;
  const artistItem = s.ArtistItems?.[0];
  const ms = s.MediaSources?.[0];
  const audioStream = ms?.MediaStreams?.find((m: any) => m.Type === "Audio");

  const cover: CoverSource = (s.AlbumId && s.AlbumPrimaryImageTag)
    ? { kind: "emby", itemId: s.AlbumId, tag: s.AlbumPrimaryImageTag }
    : { kind: "none" };

  return {
    id: s.Id,
    title: s.Name ?? "Unknown",
    artist: artistItem?.Name ?? "Unknown Artist",
    artistId: artistItem?.Id ?? "",
    cover,
    duration: String(Math.round(Number(ticks) / 10_000_000)),
    streamUrl: client.buildStreamUrl(s.Id),
    albumId: s.AlbumId ?? "",
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

export async function getInstantMix(
  client: EmbyClient,
  itemId: string,
  limit = 50
): Promise<GetInstantMixResult> {
  const raw = await fetchInstantMix(client, itemId, limit);
  const items = raw?.Items ?? [];
  return items
    .map((s: any) => normalizeItem(s, client))
    .filter((s): s is Song => s !== null);
}
