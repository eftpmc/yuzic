import { CoverSource, SongBase } from "@/types";
import type { JellyfinClient } from "../client";

function normalizeTrack(item: any): SongBase {
  const artistItem = item.ArtistItems?.[0];
  const cover: CoverSource = item.Id
    ? { kind: "jellyfin", itemId: item.Id }
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
    serverPlayCount: item.UserData?.PlayCount ?? undefined,
    serverLastPlayedAt: item.UserData?.LastPlayedDate
      ? new Date(item.UserData.LastPlayedDate).getTime()
      : undefined,
  };
}

export async function getTracks(client: JellyfinClient): Promise<SongBase[]> {
  const path =
    `/Users/${encodeURIComponent(client.userId)}/Items` +
    `?IncludeItemTypes=Audio` +
    `&Recursive=true` +
    `&SortBy=SortName` +
    `&Fields=RunTimeTicks,ArtistItems,AlbumId,ProductionYear,DateCreated,UserData` +
    (client.parentId ? `&ParentId=${encodeURIComponent(client.parentId)}` : "");

  const raw = await client.request<any>(path);
  const items = raw?.Items ?? [];
  return items
    .filter((item: any) => item?.Id)
    .map((item: any) => normalizeTrack(item));
}
