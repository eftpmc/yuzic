import { SongBase } from "@/types";
import type { MediaBrowserClient } from "../client";
import { buildSongCover } from "../brand";
import { MediaBrowserItem, MediaBrowserItemsResponse } from "../types";

function normalizeTrack(item: MediaBrowserItem, client: MediaBrowserClient): SongBase {
  const artistItem = item.ArtistItems?.[0];
  const cover = buildSongCover(client.brand, item.Id, item.AlbumId, item.AlbumPrimaryImageTag ?? undefined);

  return {
    id: item.Id ?? "",
    title: item.Name ?? "Unknown",
    artist: artistItem?.Name ?? "Unknown Artist",
    artistId: artistItem?.Id ?? "",
    albumId: item.AlbumId ?? "",
    cover,
    duration: String(Math.floor((item.RunTimeTicks ?? 0) / 10_000_000)),
    disc: item.ParentIndexNumber ?? undefined,
    trackNumber: item.IndexNumber ?? undefined,
    year: item.ProductionYear ?? undefined,
    dateAdded: item.DateCreated ?? undefined,
    serverPlayCount: item.UserData?.PlayCount ?? undefined,
    serverLastPlayedAt: item.UserData?.LastPlayedDate
      ? new Date(item.UserData.LastPlayedDate).getTime()
      : undefined,
  };
}

export async function getTracks(client: MediaBrowserClient): Promise<SongBase[]> {
  const path =
    `/Users/${encodeURIComponent(client.userId)}/Items` +
    `?IncludeItemTypes=Audio` +
    `&Recursive=true` +
    `&SortBy=SortName` +
    `&Fields=RunTimeTicks,ArtistItems,AlbumId,ProductionYear,DateCreated,UserData,IndexNumber,ParentIndexNumber` +
    (client.parentId ? `&ParentId=${encodeURIComponent(client.parentId)}` : "");

  const raw = await client.request<MediaBrowserItemsResponse>(path);
  const items = raw?.Items ?? [];
  return items
    .filter((item) => item?.Id)
    .map((item) => normalizeTrack(item, client));
}
