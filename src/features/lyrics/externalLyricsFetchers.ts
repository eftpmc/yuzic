import { getLyrics as getLrclibLyrics } from "@/api/lrclib";
import type { ExternalLyricsFetchers } from "./resolveLyrics";

/** The real (network-backed) fetcher for every external lyrics source the
 *  app knows about. Kept separate from `resolveLyrics` so tests can inject
 *  fakes instead of this module. */
export const externalLyricsFetchers: ExternalLyricsFetchers = {
  lrclib: song =>
    getLrclibLyrics({
      artist: song.artist,
      title: song.title,
      album: song.album,
      durationSec: song.durationSec,
    }),
};
