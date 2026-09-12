import { parseLrc } from "./parseLrc";

describe("parseLrc", () => {
  it("parses [mm:ss.xx] timestamps into startMs", () => {
    const lrc = "[00:00.00] first\n[00:04.20] second";

    expect(parseLrc(lrc)).toEqual([
      { startMs: 0, text: "first" },
      { startMs: 4200, text: "second" },
    ]);
  });

  it("parses centisecond and millisecond fractions correctly", () => {
    const lrc = "[01:02.5] a\n[00:01.123] b";

    // Sorted by timestamp — "b" at ~1.1s comes before "a" at ~62.5s.
    expect(parseLrc(lrc)).toEqual([
      { startMs: 1_123, text: "b" },
      // .5 as a 1-digit fraction pads to 500ms
      { startMs: 62_500, text: "a" },
    ]);
  });

  it("supports multiple timestamps sharing one line of text", () => {
    const lrc = "[00:01.00][00:05.00] repeated";

    expect(parseLrc(lrc)).toEqual([
      { startMs: 1000, text: "repeated" },
      { startMs: 5000, text: "repeated" },
    ]);
  });

  it("skips metadata tags and blank/untimed lines", () => {
    const lrc = "[ar:Some Artist]\n[ti:Some Title]\n\n[00:00.00]\n[00:02.00] real line";

    expect(parseLrc(lrc)).toEqual([{ startMs: 2000, text: "real line" }]);
  });

  it("sorts lines by timestamp even if the source is out of order", () => {
    const lrc = "[00:05.00] later\n[00:01.00] earlier";

    expect(parseLrc(lrc)).toEqual([
      { startMs: 1000, text: "earlier" },
      { startMs: 5000, text: "later" },
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseLrc("")).toEqual([]);
  });
});
