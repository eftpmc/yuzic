import { Artist } from "@/types";
import type { MediaBrowserClient } from "../client";
import { buildCoverWithTag } from "../brand";
import { MediaBrowserItemsResponse } from "../types";

export type GetArtistsResult = Artist[];

export async function getArtists(client: MediaBrowserClient): Promise<GetArtistsResult> {
  const path =
    `/Items` +
    `?IncludeItemTypes=MusicArtist` +
    `&Recursive=true` +
    `&SortBy=SortName` +
    `&Fields=PrimaryImageTag,Overview,Genres,DateCreated,ProviderIds` +
    (client.parentId ? `&ParentId=${encodeURIComponent(client.parentId)}` : "");

  const raw = await client.request<MediaBrowserItemsResponse>(path);
  const items = raw?.Items ?? [];

  return items.map((a) => {
    const cover = buildCoverWithTag(client.brand, a.Id, a.ImageTags?.Primary ?? undefined);

    const mbid = a.ProviderIds?.MusicBrainz ?? null;

    return {
      id: a.Id ?? "",
      name: a.Name ?? "Unknown Artist",
      cover,
      subtext: "Artist",
      mbid,
      albumIds: [],
    };
  });
}
