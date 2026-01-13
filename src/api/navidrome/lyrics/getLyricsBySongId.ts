import { LyricsResult } from "../../types";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

type NavidromeLyricLine = {
  start: number; // milliseconds
  value: string;
};

type NavidromeStructuredLyrics = {
  synced: boolean;
  line: NavidromeLyricLine[];
};

type NavidromeLyricsList = {
  structuredLyrics?: NavidromeStructuredLyrics[];
};

type NavidromeSubsonicResponse = {
  lyricsList?: NavidromeLyricsList;
};

type NavidromeResponse = {
  "subsonic-response"?: NavidromeSubsonicResponse;
};

export async function getLyricsBySongId(
  serverUrl: string,
  username: string,
  password: string,
  songId: string
): Promise<LyricsResult | null> {
  const url =
    `${serverUrl}/rest/getLyricsBySongId.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json` +
    `&id=${songId}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const raw: NavidromeResponse = await res.json();

  const structured =
    raw["subsonic-response"]?.lyricsList?.structuredLyrics?.[0];

  if (!structured || !structured.synced || structured.line.length === 0) {
    return null;
  }

  return {
    provider: "navidrome",
    synced: true,
    lines: structured.line
      .filter((l): l is NavidromeLyricLine =>
        typeof l.value === "string" && l.value.trim().length > 0
      )
      .map(l => ({
        startMs: l.start,
        text: l.value,
      })),
  };
}