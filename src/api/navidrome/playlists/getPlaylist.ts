import { Playlist, Song } from "@/types";
import type { NavidromeClient } from "../client";

export type GetPlaylistResult = Playlist | null;

export async function getPlaylist(
  client: NavidromeClient,
  playlistId: string
): Promise<GetPlaylistResult> {
  const raw = await client.request<any>("getPlaylist.view", { id: playlistId });
  const playlist = raw?.["subsonic-response"]?.playlist;
  if (!playlist) return null;

  const entries = playlist.entry || [];

  const songs: Song[] = entries.map((s: any) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    artistId: s.artistId ?? "",
    duration: String(s.duration ?? 0),
    cover: s.coverArt
      ? { kind: "navidrome", coverArtId: s.coverArt }
      : { kind: "none" },
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
  }));

  return {
    id: playlist.id,
    cover: playlist.coverArt
      ? { kind: "navidrome", coverArtId: playlist.coverArt }
      : { kind: "none" },
    title: playlist.name ?? "Playlist",
    subtext: `Playlist • ${songs.length} songs`,
    changed: new Date(playlist.changed),
    created: new Date(playlist.created),
    songs
  };
}