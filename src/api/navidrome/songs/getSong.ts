import { Song } from "@/types";
import type { NavidromeClient } from "../client";
import { SubsonicResponse } from "../types";

export async function getSong(
  client: NavidromeClient,
  songId: string
): Promise<Song | null> {
  try {
    const raw = await client.request<SubsonicResponse>("getSong.view", { id: songId });
    const s = raw?.["subsonic-response"]?.song;
    if (!s?.id) return null;

    const streamUrl = client.buildStreamUrl(s.id);

    return {
      id: s.id,
      title: s.title ?? "Unknown",
      artist: s.artist ?? "Unknown Artist",
      artistId: s.artistId ?? "",
      albumId: s.albumId ?? "",
      cover: s.coverArt
        ? { kind: "navidrome", coverArtId: s.coverArt }
        : { kind: "none" },
      duration: String(s.duration ?? 0),
      streamUrl,
      filePath: s.path ?? undefined,
      bitrate: s.bitRate ?? undefined,
      sampleRate: s.samplingRate ?? undefined,
      bitsPerSample: s.bitDepth ?? undefined,
      mimeType: s.contentType ?? undefined,
      dateReleased: s.year != null ? String(s.year) : undefined,
      disc: s.discNumber ?? undefined,
      trackNumber: s.track ?? undefined,
      dateAdded: s.created ?? undefined,
      bpm: s.bpm ?? undefined,
      genres: Array.isArray(s.genres) && s.genres.length > 0
        ? s.genres.map((g) => (typeof g === "string" ? g : g?.name)).filter((g): g is string => !!g)
        : undefined,
    };
  } catch (error) {
    console.error("Failed to fetch Navidrome song:", error);
    return null;
  }
}
