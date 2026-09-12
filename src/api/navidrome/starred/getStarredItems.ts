import { AlbumBase, Song } from "@/types";
import { makeLocalId } from "@/types/EntityId";
import type { NavidromeClient } from "../client";
import { normalizeAlbumEntry } from "../albums/getAlbumList";
import { SubsonicResponse } from "../types";

export interface GetStarredItemsResult {
  songs: Song[];
  albums: AlbumBase[];
}

export async function getStarredItems(
  client: NavidromeClient
): Promise<GetStarredItemsResult> {
  const raw = await client.request<SubsonicResponse>("getStarred.view");
  const starred = raw?.["subsonic-response"]?.starred ?? {};
  const sourceServerId = client.serverId;

  return {
    albums: (starred.album ?? []).map((a) => normalizeAlbumEntry(a, sourceServerId)),
    songs: (starred.song ?? [])
      .filter((s): s is typeof s & { id: string } => !!s?.id)
      .map((s) => ({
        id: s.id,
        title: s.title ?? "Unknown",
        artist: s.artist ?? "Unknown Artist",
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
          ? s.genres.map((g) => (typeof g === "string" ? g : g?.name)).filter((g): g is string => !!g)
          : undefined,
        localId: sourceServerId
          ? makeLocalId({ kind: "track", sourceServerId, serverItemId: s.id })
          : undefined,
        libraryState: "in-library",
      })),
  };
}
