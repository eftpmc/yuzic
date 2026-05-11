import { Artist, CoverSource } from "@/types";
import type { JellyfinClient } from "../client";

export type GetArtistsResult = Artist[];

export async function getArtists(client: JellyfinClient): Promise<GetArtistsResult> {
  const path =
    `/Items` +
    `?IncludeItemTypes=MusicArtist` +
    `&Recursive=true` +
    `&SortBy=SortName` +
    `&Fields=PrimaryImageTag,Overview,Genres,DateCreated,ProviderIds` +
    (client.parentId ? `&ParentId=${encodeURIComponent(client.parentId)}` : "");

  const raw = await client.request<any>(path);
  const items = raw?.Items ?? [];

  return items.map((a: any) => {
    const cover: CoverSource = a.Id
          ? { kind: "jellyfin", itemId: a.Id }
          : { kind: "none" };

    const mbid = a.ProviderIds?.MusicBrainz ?? null;

    return {
      id: a.Id,
      name: a.Name ?? "Unknown Artist",
      cover,
      subtext: "Artist",
      mbid,
      albumIds: [],
    };
  });
}
