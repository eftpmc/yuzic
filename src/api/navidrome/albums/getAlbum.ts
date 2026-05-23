import { Album, CoverSource, Song } from "@/types";
import type { NavidromeClient } from "../client";
import { getArtist } from "../artists/getArtist";
import { getAlbumInfo } from "./getAlbumInfo";

export type GetAlbumResult = Album | null;

export async function getAlbum(
  client: NavidromeClient,
  albumId: string
): Promise<GetAlbumResult> {
  const raw = await client.request<any>("getAlbum.view", { id: albumId });
  const album = raw?.["subsonic-response"]?.album;
  if (!album) return null;

  const [artist, albumInfo] = await Promise.all([
    getArtist(client, album.artistId),
    getAlbumInfo(client, albumId),
  ]);
  if (!artist) return null;

  const cover: CoverSource = album.coverArt
    ? { kind: "navidrome", coverArtId: album.coverArt }
    : { kind: "none" };

  const songs: Song[] = (album.song || []).map((s: any) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    artistId: s.artistId,
    duration: s.duration,
    cover,
    albumId: album.id,
    albumTitle: album.name,
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
      : s.genre
      ? [s.genre]
      : undefined,
  }));

  return {
    id: album.id,
    cover,
    title: album.name,
    subtext:
      songs.length > 1
        ? `Album • ${artist.name}`
        : `Single • ${artist.name}`,
    artist,
    year: album.year,
    genres: album.genre ? [album.genre] : [],
    created: album.created ? new Date(album.created) : new Date(0),
    mbid: albumInfo.musicBrainzId,
    songs,
  };
}