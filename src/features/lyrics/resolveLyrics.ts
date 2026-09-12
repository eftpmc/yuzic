import type { LyricsResult } from "@/api/types";

/**
 * The one external source available today. A plain string union (rather than
 * an enum) keeps the redux slice's persisted value a plain JSON string.
 */
export type ExternalLyricsSourceId = "lrclib";

export const ALL_EXTERNAL_LYRICS_SOURCES: readonly ExternalLyricsSourceId[] = ["lrclib"];

/** Enough about the current song for an external source to look itself up. */
export type LyricsSongInfo = {
  songId: string;
  title: string;
  artist: string;
  album?: string;
  /** Seconds. LRCLIB uses this to disambiguate same-named tracks. */
  durationSec?: number;
};

export type ExternalLyricsFetcher = (song: LyricsSongInfo) => Promise<LyricsResult | null>;

/** One fetcher per source id. Extending the fallback chain with a second
 *  external source only means adding an entry here and to
 *  `ALL_EXTERNAL_LYRICS_SOURCES` — nothing else in this file changes. */
export type ExternalLyricsFetchers = Partial<Record<ExternalLyricsSourceId, ExternalLyricsFetcher>>;

export type ResolveLyricsInput = {
  song: LyricsSongInfo;
  /** The server-embedded lookup — always tried first, unconditionally. */
  getServerLyrics: (songId: string) => Promise<LyricsResult | null>;
  /** The user's fallback order, enabled sources only, most-preferred first.
   *  Disabled sources are simply absent from this list — there is no
   *  separate enabled/disabled bit to reconcile against the order here. */
  enabledExternalSourcesInOrder: ExternalLyricsSourceId[];
  fetchers: ExternalLyricsFetchers;
};

/**
 * Server-embedded lyrics first, then each enabled external source in the
 * user's chosen order, stopping at the first non-empty result.
 *
 * When `enabledExternalSourcesInOrder` is empty — the default, since every
 * external source ships off — this behaves exactly like the bare
 * `api.lyrics.getBySongId()` call it replaces: server-only, no external
 * network calls at all.
 */
export async function resolveLyrics(input: ResolveLyricsInput): Promise<LyricsResult | null> {
  const { song, getServerLyrics, enabledExternalSourcesInOrder, fetchers } = input;

  const serverResult = await getServerLyrics(song.songId);
  if (serverResult && serverResult.lines.length > 0) {
    return serverResult;
  }

  for (const sourceId of enabledExternalSourcesInOrder) {
    const fetcher = fetchers[sourceId];
    if (!fetcher) continue;

    const result = await fetcher(song);
    if (result && result.lines.length > 0) {
      return result;
    }
  }

  return null;
}
