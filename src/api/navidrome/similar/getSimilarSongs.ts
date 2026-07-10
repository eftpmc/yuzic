import { CoverSource, Song } from "@/types";
import type { NavidromeClient } from "../client";
import { SubsonicResponse } from "../types";

export async function getSimilarSongs(
  client: NavidromeClient,
  id: string,
  count = 50
): Promise<Song[]> {
  try {
    const raw = await client.request<SubsonicResponse>("getSimilarSongs.view", { id, count });
    const similar = raw?.["subsonic-response"]?.similarSongs?.song ?? [];
    if (!Array.isArray(similar)) return [];

    return similar
      .filter((s): s is typeof s & { id: string } => !!s?.id)
      .map((s) => {
        const cover: CoverSource = s.coverArt
          ? { kind: "navidrome", coverArtId: s.coverArt }
          : { kind: "none" };

        return {
          id: s.id,
          title: s.title ?? "Unknown",
          artist: s.artist ?? "Unknown Artist",
          artistId: s.artistId ?? "",
          albumId: s.albumId ?? "",
          cover,
          duration: String(s.duration ?? 0),
          streamUrl: client.buildStreamUrl(s.id),
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
      });
  } catch (error) {
    console.error("Navidrome getSimilarSongs failed:", error);
    return [];
  }
}
