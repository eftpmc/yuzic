import { AlbumBase, CoverSource } from "@/types";
import type { EmbyClient } from "../client";

export type GetAlbumsResult = AlbumBase[];

function normalizeAlbum(a: any): AlbumBase | null {
  try {
    const albumId = a.Id;
    if (!albumId) return null;

    const primaryTag: string | undefined = a.ImageTags?.Primary ?? undefined;
    const cover: CoverSource = (albumId && primaryTag)
      ? { kind: "emby", itemId: albumId, tag: primaryTag }
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
    const serverLastPlayedAt = a.UserData?.LastPlayedDate
      ? new Date(a.UserData.LastPlayedDate).getTime()
      : undefined;

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
      serverPlayCount: a.UserData?.PlayCount ?? undefined,
      serverLastPlayedAt: serverLastPlayedAt && !isNaN(serverLastPlayedAt) ? serverLastPlayedAt : undefined,
    };
  } catch (error) {
    console.error(`Failed to normalize album:`, error);
    return null;
  }
}


export async function getAlbums(
  client: EmbyClient,
  artistId?: string
): Promise<GetAlbumsResult> {
  const baseParams =
    `IncludeItemTypes=MusicAlbum` +
    `&Recursive=true` +
    `&SortBy=SortName` +
    `&Fields=PrimaryImageTag,Genres,AlbumArtist,ArtistItems,Artists,DateCreated,ProviderIds,UserData`;

  const path =
    `/Items?${baseParams}` +
    (artistId ? `&AlbumArtistIds=${encodeURIComponent(artistId)}` : "") +
    (client.parentId ? `&ParentId=${encodeURIComponent(client.parentId)}` : "");

  const raw = await client.request(path) as any;
  const items: any[] = raw?.Items ?? [];

  return items.map((a: any) => normalizeAlbum(a)).filter((a): a is AlbumBase => a !== null);
}
