import type { JellyfinClient } from "../client";
import { LyricsResult } from "../../types";

type JellyfinLyricsResponse = {
  Lyrics?: {
    Start: number; // ticks
    Text: string;
  }[];
  SyncedLyrics?: {
    StartPositionTicks: number;
    Text: string;
  }[];
};

export async function getLyricsBySongId(
  client: JellyfinClient,
  songId: string
): Promise<LyricsResult | null> {
  try {
    const json = await client.request<JellyfinLyricsResponse>(
      `/Audio/${songId}/Lyrics`,
      { tokenOnly: true }
    );

    if (json.Lyrics?.length) {
      return {
        provider: "jellyfin",
        synced: true,
        lines: json.Lyrics
          .filter((l) => l.Text?.trim())
          .map((l) => ({
            startMs: Math.floor(l.Start / 10_000),
            text: l.Text,
          })),
      };
    }
    return null;
  } catch {
    return null;
  }
}