import type { LyricsResult } from "@/api/types";
import { fetchWithTimeout } from "@/api/fetchWithTimeout";
import { parseLrc } from "./parseLrc";

const BASE = "https://lrclib.net/api";
// LRCLIB is a none-tier source: no key, no account. It only asks that
// clients identify themselves with a real User-Agent, which this satisfies
// without needing any credential the user would have to go get.
const HEADERS = {
  "User-Agent": "yuzic (https://github.com/yuzicapp/yuzic)",
  Accept: "application/json",
};

export type GetLyricsInput = {
  artist: string;
  title: string;
  album?: string;
  durationSec?: number;
};

type LrclibGetResponse = {
  id?: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

/**
 * Turns an LRCLIB `/api/get` response into the app's `LyricsResult`, or null
 * when the track has no usable lyrics.
 *
 * LRCLIB is modelled as ONE source, not two: it prefers `syncedLyrics` and
 * only falls back to `plainLyrics` internally when nothing synced exists.
 * There is no separate "LRCLIB (plain)" fallback link for callers to
 * configure — that distinction lives inside this function.
 */
function toLyricsResult(data: LrclibGetResponse): LyricsResult | null {
  if (data.syncedLyrics && data.syncedLyrics.trim()) {
    const lines = parseLrc(data.syncedLyrics);
    if (lines.length > 0) {
      return { provider: "lrclib", synced: true, lines };
    }
  }

  if (data.plainLyrics && data.plainLyrics.trim()) {
    const lines = data.plainLyrics
      .split(/\r?\n/)
      .map(text => text.trim())
      .filter(text => text.length > 0)
      .map(text => ({ startMs: 0, text }));
    if (lines.length > 0) {
      return { provider: "lrclib", synced: false, lines };
    }
  }

  return null;
}

/**
 * Looks up lyrics on LRCLIB (https://lrclib.net) for one track.
 *
 * Anonymous, no API key, no account — the "none" auth tier. Returns null on
 * a 404 (LRCLIB's answer for "no match"), on an empty/instrumental result,
 * or on any network failure, so a caller can treat this the same way as
 * "no lyrics" rather than needing a separate error path.
 */
export async function getLyrics(input: GetLyricsInput): Promise<LyricsResult | null> {
  const params = new URLSearchParams({
    artist_name: input.artist,
    track_name: input.title,
  });
  if (input.album) params.set("album_name", input.album);
  if (typeof input.durationSec === "number" && input.durationSec > 0) {
    params.set("duration", String(Math.round(input.durationSec)));
  }

  try {
    const res = await fetchWithTimeout(`${BASE}/get?${params.toString()}`, {
      headers: HEADERS,
    });

    if (res.status === 404) return null;
    if (!res.ok) return null;

    const data = (await res.json()) as LrclibGetResponse;
    if (data.instrumental) return null;

    return toLyricsResult(data);
  } catch {
    // LRCLIB being unreachable is the same as it having nothing — an
    // external fallback source failing silently is what lets the fallback
    // chain move on to the next source (or to nothing) without throwing.
    return null;
  }
}
