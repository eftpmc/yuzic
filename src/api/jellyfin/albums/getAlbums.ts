import { Album, CoverSource } from "@/types";
import type { JellyfinClient } from "../client";

export type GetAlbumsResult = Album[];

function normalizeAlbum(a: any): Album | null {
  try {
    const albumId = a.Id;
    if (!albumId) return null;

    const cover: CoverSource = albumId
      ? { kind: "jellyfin", itemId: albumId }
      : { kind: "none" };

    const artistItem = a.ArtistItems?.[0];

    const artist = {
      id: artistItem?.Id ?? "unknown",
      name: artistItem?.Name ?? "Unknown Artist",
      cover: { kind: "none" as const },
      subtext: "Artist",
      mbid: artistItem?.ProviderIds?.MusicBrainz ?? null,
    };

    const albumMbid = a.ProviderIds?.MusicBrainzAlbum ?? a.ProviderIds?.MusicBrainz ?? null;

    return {
      id: albumId,
      cover,
      title: a.Name ?? "Unknown Album",
      subtext: `Album • ${artist.name}`,
      artist,
      year: a.ProductionYear,
      genres: (a.Genres ?? [])
        .flatMap((g: string) => g.split(";"))
        .map((g: string) => g.trim())
        .filter(Boolean),
      created: a.DateCreated ? new Date(a.DateCreated) : new Date(0),
      mbid: albumMbid,
      songs: [],
    };
  } catch (error) {
    console.error(`Failed to normalize album:`, error);
    return null;
  }
}


export async function getAlbums(
  client: JellyfinClient,
  artistId?: string
): Promise<GetAlbumsResult> {
  try {
    const baseParams =
      `IncludeItemTypes=MusicAlbum` +
      `&Recursive=true` +
      `&SortBy=SortName` +
      `&Fields=PrimaryImageTag,Genres,AlbumArtist,ArtistItems,Artists,DateCreated,ProviderIds`;

    const path =
      `/Items?${baseParams}` +
      (artistId ? `&AlbumArtistIds=${encodeURIComponent(artistId)}` : "") +
      (client.parentId ? `&ParentId=${encodeURIComponent(client.parentId)}` : "");

    const raw = await client.request(path) as any;
    const items: any[] = raw?.Items ?? [];

    const albums = items.map((a: any) => normalizeAlbum(a));

    return albums.filter((a): a is Album => a !== null);
  } catch (error) {
    console.error(`Failed to fetch albums:`, error);
    return [];
  }
}
