import { resolveLyrics } from "./resolveLyrics";
import type { LyricsResult } from "@/api/types";
import type { LyricsSongInfo } from "./resolveLyrics";

const song: LyricsSongInfo = { songId: "s1", title: "T", artist: "A" };

const serverResult: LyricsResult = { provider: "navidrome", synced: true, lines: [{ startMs: 0, text: "server" }] };
const lrclibResult: LyricsResult = { provider: "lrclib", synced: true, lines: [{ startMs: 0, text: "lrclib" }] };

describe("resolveLyrics", () => {
  it("returns the server result without calling any external source", async () => {
    const getServerLyrics = jest.fn().mockResolvedValue(serverResult);
    const lrclibFetcher = jest.fn();

    const result = await resolveLyrics({
      song,
      getServerLyrics,
      enabledExternalSourcesInOrder: ["lrclib"],
      fetchers: { lrclib: lrclibFetcher },
    });

    expect(result).toEqual(serverResult);
    expect(lrclibFetcher).not.toHaveBeenCalled();
  });

  it("is server-only when nothing external is enabled (today's behavior)", async () => {
    const getServerLyrics = jest.fn().mockResolvedValue(null);
    const lrclibFetcher = jest.fn().mockResolvedValue(lrclibResult);

    const result = await resolveLyrics({
      song,
      getServerLyrics,
      enabledExternalSourcesInOrder: [],
      fetchers: { lrclib: lrclibFetcher },
    });

    expect(result).toBeNull();
    expect(lrclibFetcher).not.toHaveBeenCalled();
  });

  it("falls through to an enabled external source when the server has nothing", async () => {
    const getServerLyrics = jest.fn().mockResolvedValue(null);
    const lrclibFetcher = jest.fn().mockResolvedValue(lrclibResult);

    const result = await resolveLyrics({
      song,
      getServerLyrics,
      enabledExternalSourcesInOrder: ["lrclib"],
      fetchers: { lrclib: lrclibFetcher },
    });

    expect(result).toEqual(lrclibResult);
    expect(lrclibFetcher).toHaveBeenCalledWith(song);
  });

  it("treats an empty-lines server result the same as no result", async () => {
    const getServerLyrics = jest.fn().mockResolvedValue({ provider: "navidrome", synced: true, lines: [] });
    const lrclibFetcher = jest.fn().mockResolvedValue(lrclibResult);

    const result = await resolveLyrics({
      song,
      getServerLyrics,
      enabledExternalSourcesInOrder: ["lrclib"],
      fetchers: { lrclib: lrclibFetcher },
    });

    expect(result).toEqual(lrclibResult);
  });

  it("tries sources in the user's order and stops at the first hit, skipping later ones", async () => {
    // Only "lrclib" ships today, but the resolver is generic over the id
    // type — this proves order/short-circuit behavior ahead of a second
    // real source existing, using a second fake id cast for the test.
    const getServerLyrics = jest.fn().mockResolvedValue(null);
    const first = jest.fn().mockResolvedValue(lrclibResult);
    const second = jest.fn().mockResolvedValue(lrclibResult);

    const result = await resolveLyrics({
      song,
      getServerLyrics,
      enabledExternalSourcesInOrder: ["second", "lrclib"] as unknown as ["lrclib"],
      fetchers: { lrclib: first, second } as unknown as { lrclib: typeof first },
    });

    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
    expect(result).toEqual(lrclibResult);
  });

  it("returns null when server and every external source miss", async () => {
    const getServerLyrics = jest.fn().mockResolvedValue(null);
    const lrclibFetcher = jest.fn().mockResolvedValue(null);

    const result = await resolveLyrics({
      song,
      getServerLyrics,
      enabledExternalSourcesInOrder: ["lrclib"],
      fetchers: { lrclib: lrclibFetcher },
    });

    expect(result).toBeNull();
  });
});
