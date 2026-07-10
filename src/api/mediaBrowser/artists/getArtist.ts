import { Artist } from "@/types";
import type { MediaBrowserClient } from "../client";
import { buildCover } from "../brand";

export type GetArtistResult = Artist | null;

export async function getArtist(
  client: MediaBrowserClient,
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

  const cover = buildCover(client.brand, artistRaw.Id);

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
