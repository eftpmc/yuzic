import type { MediaBrowserClient } from "../client";
import { LyricsResult } from "../../types";

type MediaBrowserLyricsResponse = {
  Lyrics?: {
    /** Ticks. Absent on an unsynced list — the lines are just text. */
    Start?: number;
    Text: string;
  }[];
  SyncedLyrics?: {
    StartPositionTicks: number;
    Text: string;
  }[];
};

const TICKS_PER_MS = 10_000;

export async function getLyricsBySongId(
  client: MediaBrowserClient,
  songId: string
): Promise<LyricsResult | null> {
  try {
    const json = await client.request<MediaBrowserLyricsResponse>(
      `/Audio/${songId}/Lyrics`,
      { tokenOnly: true }
    );

    // `SyncedLyrics` was declared here and never read. Where a server sends it
    // it is unambiguously timed, so it wins over the generic list.
    if (json.SyncedLyrics?.length) {
      const lines = json.SyncedLyrics
        .filter((l) => l.Text?.trim())
        .map((l) => ({
          startMs: Math.floor(l.StartPositionTicks / TICKS_PER_MS),
          text: l.Text,
        }));
      if (lines.length) {
        return { provider: client.brand.kind, synced: true, lines };
      }
    }

    if (json.Lyrics?.length) {
      // The same field carries both kinds: a timed list has a `Start` on its
      // lines, an untimed one doesn't. Treating "no timings" as "no lyrics" is
      // what used to drop plain lyrics entirely.
      const synced = json.Lyrics.some((l) => typeof l.Start === 'number' && l.Start > 0);
      const lines = json.Lyrics
        .filter((l) => l.Text?.trim())
        .map((l) => ({
          startMs: synced ? Math.floor((l.Start ?? 0) / TICKS_PER_MS) : 0,
          text: l.Text,
        }));
      if (lines.length) {
        return { provider: client.brand.kind, synced, lines };
      }
    }
    return null;
  } catch {
    return null;
  }
}
