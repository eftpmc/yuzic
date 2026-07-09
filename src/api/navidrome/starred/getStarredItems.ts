import { AlbumBase, Song } from "@/types";
import type { NavidromeClient } from "../client";
import { normalizeAlbumEntry } from "../albums/getAlbumList";

export interface GetStarredItemsResult {
  songs: Song[];
  albums: AlbumBase[];
}

export async function getStarredItems(
  client: NavidromeClient
): Promise<GetStarredItemsResult> {
  const raw = await client.request<any>("getStarred.view");
  const starred = raw?.["subsonic-response"]?.starred || {};

  return {
    albums: (starred.album || []).map(normalizeAlbumEntry),
    songs: (starred.song || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      artistId: s.artistId ?? "",
      albumId: s.albumId ?? "",
      cover: s.coverArt
        ? { kind: "navidrome" as const, coverArtId: s.coverArt }
        : { kind: "none" as const },
      duration: String(s.duration ?? 0),
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
    })),
  };
}