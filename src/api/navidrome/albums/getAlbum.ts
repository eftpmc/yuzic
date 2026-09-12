import { Album, CoverSource, Song } from "@/types";
import { makeLocalId } from "@/types/EntityId";
import type { NavidromeClient } from "../client";
import { getArtist } from "../artists/getArtist";
import { getAlbumInfo } from "./getAlbumInfo";
import { SubsonicResponse } from "../types";

export type GetAlbumResult = Album | null;

export async function getAlbum(
  client: NavidromeClient,
  albumId: string
): Promise<GetAlbumResult> {
  const raw = await client.request<SubsonicResponse>("getAlbum.view", { id: albumId });
  const album = raw?.["subsonic-response"]?.album;
  if (!album) return null;

  const [artist, albumInfo] = await Promise.all([
    getArtist(client, album.artistId ?? ""),
    getAlbumInfo(client, albumId),
  ]);
  if (!artist) return null;

  const cover: CoverSource = album.coverArt
    ? { kind: "navidrome", coverArtId: album.coverArt }
    : { kind: "none" };

  const resolvedAlbumId = album.id ?? "";
  const sourceServerId = client.serverId;

  const songs: Song[] = (album.song ?? [])
    .filter((s): s is typeof s & { id: string } => !!s?.id)
    .map((s) => ({
      id: s.id,
      title: s.title ?? "Unknown",
      artist: s.artist ?? "Unknown Artist",
      artistId: s.artistId ?? "",
      duration: String(s.duration ?? 0),
      cover,
      albumId: resolvedAlbumId,
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
        ? s.genres.map((g) => (typeof g === "string" ? g : g?.name)).filter((g): g is string => !!g)
        : s.genre
        ? [s.genre]
        : undefined,
      localId: sourceServerId
        ? makeLocalId({ kind: "track", sourceServerId, serverItemId: s.id })
        : undefined,
      libraryState: "in-library",
    }));

  return {
    id: resolvedAlbumId,
    cover,
    title: album.name ?? "Unknown Album",
    subtext:
      songs.length > 1
        ? `Album • ${artist.name}`
        : `Single • ${artist.name}`,
    artist: {
      ...artist,
      localId: sourceServerId
        ? makeLocalId({ kind: "artist", sourceServerId, serverItemId: artist.id })
        : undefined,
    },
    year: album.year ?? 0,
    genres: album.genre ? [album.genre] : [],
    created: album.created ? new Date(album.created) : new Date(0),
    mbid: albumInfo.musicBrainzId,
    songs,
    localId: sourceServerId
      ? makeLocalId({ kind: "album", sourceServerId, serverItemId: resolvedAlbumId })
      : undefined,
    libraryState: "in-library",
  };
}
