import { Artist, CoverSource } from "@/types";
import type { EmbyClient } from "../client";

export type GetArtistsResult = Artist[];

export async function getArtists(client: EmbyClient): Promise<GetArtistsResult> {
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
    const primaryTag: string | undefined = a.ImageTags?.Primary ?? undefined;
    const cover: CoverSource = (a.Id && primaryTag)
      ? { kind: "emby", itemId: a.Id, tag: primaryTag }
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
