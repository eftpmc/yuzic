import { Artist, CoverSource } from "@/types";
import type { EmbyClient } from "../client";

export type GetArtistResult = Artist | null;

export async function getArtist(
  client: EmbyClient,
  artistId: string
): Promise<GetArtistResult> {
  const path =
    `/Items` +
    `?Ids=${encodeURIComponent(artistId)}` +
    `&IncludeItemTypes=MusicArtist` +
    `&Fields=PrimaryImageTag,Overview,Genres,DateCreated,ProviderIds`;

  const raw = await client.request<any>(path);
  const artistRaw = raw?.Items?.[0];

  if (!artistRaw) {
    throw new Error("Artist not found");
  }

  const cover: CoverSource = artistRaw.Id
    ? { kind: "emby", itemId: artistRaw.Id }
    : { kind: "none" };

  const mbid = artistRaw.ProviderIds?.MusicBrainz ?? null;

  return {
    id: artistRaw.Id,
    name: artistRaw.Name ?? "Unknown Artist",
    cover,
    subtext: "Artist",
    mbid,
    albumIds: [],
  };
}
