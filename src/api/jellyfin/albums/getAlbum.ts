import { Album, CoverSource } from "@/types";
import type { JellyfinClient } from "../client";
import { getAlbumSongs } from "./getAlbumSongs";

export type GetAlbumResult = Album | null;

async function fetchGetAlbum(client: JellyfinClient, albumId: string) {
  const path =
    `/Items` +
    `?Ids=${encodeURIComponent(albumId)}` +
    `&IncludeItemTypes=MusicAlbum` +
    `&Fields=Genres,ArtistItems,PrimaryImageTag,DateCreated,ProviderIds`;
  return client.request<any>(path);
}

function normalizeAlbum(raw: any): Album | null {
  const a = raw?.Items?.[0];
  if (!a) return null;

  const artistItem = a.ArtistItems?.[0];
  if (!artistItem) return null;

  const cover: CoverSource = a.Id
    ? { kind: "jellyfin", itemId: a.Id }
    : { kind: "none" };

  const artist = {
    id: artistItem.Id,
    name: artistItem.Name ?? "Unknown Artist",
    cover: artistItem.Id
      ? { kind: "jellyfin" as const, itemId: artistItem.Id }
      : { kind: "none" as const },
    subtext: "Artist",
    mbid: artistItem.ProviderIds?.MusicBrainz ?? null,
  };

  const albumMbid = a.ProviderIds?.MusicBrainzAlbum ?? a.ProviderIds?.MusicBrainz ?? null;

  return {
    id: a.Id,
    cover,
    title: a.Name,
    subtext: "",
    artist,
    year: a.ProductionYear,
    songs: [],
    genres: (a.Genres ?? [])
      .flatMap((g: string) => g.split(";"))
      .map((g: string) => g.trim())
      .filter(Boolean),
    created: a.DateCreated ? new Date(a.DateCreated) : new Date(0),
    mbid: albumMbid,
  };
}

export async function getAlbum(
  client: JellyfinClient,
  albumId: string
): Promise<GetAlbumResult> {
  const raw = await fetchGetAlbum(client, albumId);
  const base = normalizeAlbum(raw);
  if (!base) return null;

  const songs = await getAlbumSongs(client, base);

  return {
    ...base,
    subtext:
      songs.length > 1
        ? `Album • ${base.artist.name}`
        : `Single • ${base.artist.name}`,
    songs,
  };
}
