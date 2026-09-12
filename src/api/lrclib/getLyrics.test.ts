import { getLyrics } from "./getLyrics";
import { fetchWithTimeout } from "@/api/fetchWithTimeout";

jest.mock("@/api/fetchWithTimeout", () => ({
  fetchWithTimeout: jest.fn(),
}));

const mockedFetch = fetchWithTimeout as jest.Mock;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("lrclib getLyrics", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("prefers synced lyrics, parsed into timed lines", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse({
        syncedLyrics: "[00:00.00] hello\n[00:01.50] world",
        plainLyrics: "hello\nworld",
      })
    );

    const result = await getLyrics({ artist: "A", title: "T" });

    expect(result).toEqual({
      provider: "lrclib",
      synced: true,
      lines: [
        { startMs: 0, text: "hello" },
        { startMs: 1500, text: "world" },
      ],
    });
  });

  it("falls back to plain lyrics when nothing is synced", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse({ syncedLyrics: null, plainLyrics: "line one\nline two" })
    );

    const result = await getLyrics({ artist: "A", title: "T" });

    expect(result).toEqual({
      provider: "lrclib",
      synced: false,
      lines: [
        { startMs: 0, text: "line one" },
        { startMs: 0, text: "line two" },
      ],
    });
  });

  it("returns null on a 404 (no match)", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({}, 404));

    const result = await getLyrics({ artist: "A", title: "T" });

    expect(result).toBeNull();
  });

  it("returns null for an instrumental track", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse({ instrumental: true, plainLyrics: "should be ignored" })
    );

    const result = await getLyrics({ artist: "A", title: "T" });

    expect(result).toBeNull();
  });

  it("returns null when both lyric fields are empty", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ syncedLyrics: "", plainLyrics: "" }));

    const result = await getLyrics({ artist: "A", title: "T" });

    expect(result).toBeNull();
  });

  it("returns null instead of throwing on a network failure", async () => {
    mockedFetch.mockRejectedValue(new Error("network down"));

    const result = await getLyrics({ artist: "A", title: "T" });

    expect(result).toBeNull();
  });

  it("sends a real User-Agent and the optional query params", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ plainLyrics: "x" }));

    await getLyrics({ artist: "A", title: "T", album: "Alb", durationSec: 180.4 });

    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toContain("artist_name=A");
    expect(url).toContain("track_name=T");
    expect(url).toContain("album_name=Alb");
    expect(url).toContain("duration=180");
    expect(init.headers["User-Agent"]).toEqual(expect.stringContaining("yuzic"));
  });
});
