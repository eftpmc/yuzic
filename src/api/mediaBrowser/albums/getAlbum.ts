import { Album } from "@/types";
import type { MediaBrowserClient } from "../client";
import { buildCover } from "../brand";
import { getAlbumSongs } from "./getAlbumSongs";

export type GetAlbumResult = Album | null;

async function fetchGetAlbum(client: MediaBrowserClient, albumId: string) {
  const path =
    `/Items` +
    `?Ids=${encodeURIComponent(albumId)}` +
    `&IncludeItemTypes=MusicAlbum` +
    `&Fields=Genres,ArtistItems,PrimaryImageTag,DateCreated,ProviderIds`;
  return client.request<any>(path);
}

function normalizeAlbum(raw: any, client: MediaBrowserClient): Album | null {
  const a = raw?.Items?.[0];
  if (!a) return null;

  const artistItem = a.ArtistItems?.[0];
  if (!artistItem) return null;

  const cover = buildCover(client.brand, a.Id);

  const artist = {
    id: artistItem.Id,
    name: artistItem.Name ?? "Unknown Artist",
    cover: buildCover(client.brand, artistItem.Id),
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
  client: MediaBrowserClient,
  albumId: string
): Promise<GetAlbumResult> {
  const raw = await fetchGetAlbum(client, albumId);
  const base = normalizeAlbum(raw, client);
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
