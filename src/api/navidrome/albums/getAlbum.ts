import { Album, CoverSource } from "@/types";
import { makeLocalId } from "@/types/EntityId";
import type { NavidromeClient } from "../client";
import { getArtist } from "../artists/getArtist";
import { getAlbumInfo } from "./getAlbumInfo";
import { mapAlbumSongs } from "./mapAlbumSongs";
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

  const songs = mapAlbumSongs({ ...album, id: resolvedAlbumId }, cover, client);

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
