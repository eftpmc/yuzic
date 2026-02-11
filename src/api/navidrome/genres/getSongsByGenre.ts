import { CoverSource, Song } from "@/types";
import type { NavidromeClient } from "../client";

export type GetSongsByGenreResult = Song[];

function normalizeSongsByGenre(
  raw: any,
  client: NavidromeClient
): GetSongsByGenreResult {
  const list = raw?.["subsonic-response"]?.songsByGenre?.song || [];

  return list.map((s: any) => {
    const cover: CoverSource = s.coverArt
      ? { kind: "navidrome", coverArtId: s.coverArt }
      : { kind: "none" };

    return {
      id: s.id,
      title: s.title,
      artist: s.artist,
      artistId: s.artistId ?? "",
      duration: String(s.duration ?? 0),
      cover,
      albumId: s.albumId ?? "",
      streamUrl: client.buildStreamUrl(s.id),
      filePath: s.path ?? undefined,
      bitrate: s.bitRate ?? undefined,
      sampleRate: s.samplingRate ?? undefined,
      bitsPerSample: s.bitDepth ?? undefined,
      mimeType: s.contentType ?? undefined,
      dateReleased: s.year != null ? String(s.year) : undefined,
      disc: s.discNumber ?? undefined,
      trackNumber: s.track ?? undefined,
      dateAdded: s.created ?? undefined,
      bpm: s.bpm ?? undefined,
      genres: Array.isArray(s.genres) && s.genres.length > 0
        ? s.genres.map((g: any) => g?.name ?? g).filter(Boolean)
        : undefined,
    };
  });
}

export async function getSongsByGenre(
  client: NavidromeClient,
  genre: string,
  count = 500
): Promise<GetSongsByGenreResult> {
  const raw = await client.request<any>("getSongsByGenre.view", {
    genre,
    count,
  });
  return normalizeSongsByGenre(raw, client);
}