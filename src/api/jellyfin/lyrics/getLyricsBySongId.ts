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
  serverUrl: string,
  token: string,
  songId: string
): Promise<LyricsResult | null> {
  const res = await fetch(
    `${serverUrl}/Audio/${songId}/Lyrics`,
    {
      headers: {
        "X-Emby-Token": token,
      },
    }
  );

  if (!res.ok) return null;

  const json = (await res.json()) as JellyfinLyricsResponse;

  if (json.Lyrics?.length) {
    return {
      provider: "jellyfin",
      synced: true,
      lines: json.Lyrics
        .filter(l => l.Text?.trim())
        .map(l => ({
          startMs: Math.floor(l.Start / 10_000),
          text: l.Text,
        })),
    };
  }

  return null;
}