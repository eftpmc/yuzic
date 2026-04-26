import { CoverSource, SongBase } from "@/types";
import type { EmbyClient } from "../client";

function normalizeTrack(item: any): SongBase {
  const artistItem = item.ArtistItems?.[0];
  const albumTag: string | undefined = item.AlbumPrimaryImageTag ?? undefined;
  const cover: CoverSource = (item.AlbumId && albumTag)
    ? { kind: "emby", itemId: item.AlbumId, tag: albumTag }
    : { kind: "none" };

  return {
    id: item.Id,
    title: item.Name ?? "Unknown",
    artist: artistItem?.Name ?? "Unknown Artist",
    artistId: artistItem?.Id ?? "",
    albumId: item.AlbumId ?? "",
    cover,
    duration: String(Math.floor((item.RunTimeTicks ?? 0) / 10_000_000)),
    year: item.ProductionYear ?? undefined,
    dateAdded: item.DateCreated ?? undefined,
  };
}

export async function getTracks(client: EmbyClient): Promise<SongBase[]> {
  try {
    const path =
      `/Users/${encodeURIComponent(client.userId)}/Items` +
      `?IncludeItemTypes=Audio` +
      `&Recursive=true` +
      `&SortBy=SortName` +
      `&Fields=RunTimeTicks,ArtistItems,AlbumId,ProductionYear,DateCreated` +
      (client.parentId ? `&ParentId=${encodeURIComponent(client.parentId)}` : "");

    const raw = await client.request<any>(path);
    const items = raw?.Items ?? [];
    return items
      .filter((item: any) => item?.Id)
      .map((item: any) => normalizeTrack(item));
  } catch (error) {
    console.error("Failed to fetch Emby tracks:", error);
    return [];
  }
}
