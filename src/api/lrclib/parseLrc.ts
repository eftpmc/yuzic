import type { LyricLine } from "@/api/types";

/**
 * Parses LRC-format synced lyrics (`[mm:ss.xx] text`, one line at a time)
 * into the app's `LyricLine[]` shape.
 *
 * LRCLIB (and LRC generally) allows more than one timestamp per line
 * (`[00:01.00][00:05.00] text`) and metadata tags (`[ar:...]`, `[ti:...]`)
 * that carry no timestamp at all — both are skipped rather than treated as
 * lyric lines, since a metadata tag rendered as a lyric would read as a
 * blank or garbled line in the sheet.
 */
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const timeTag = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  for (const rawLine of lrc.split(/\r?\n/)) {
    const tags = [...rawLine.matchAll(timeTag)];
    if (tags.length === 0) continue;

    const text = rawLine.replace(timeTag, "").trim();
    if (!text) continue;

    for (const tag of tags) {
      const minutes = Number(tag[1]);
      const seconds = Number(tag[2]);
      const fraction = tag[3] ?? "0";
      // A 2-digit fraction is centiseconds, a 3-digit one is milliseconds —
      // pad/truncate to milliseconds either way.
      const ms = Number(fraction.padEnd(3, "0").slice(0, 3));
      const startMs = Math.round(minutes * 60_000 + seconds * 1000 + ms);
      lines.push({ startMs, text });
    }
  }

  return lines.sort((a, b) => a.startMs - b.startMs);
}
