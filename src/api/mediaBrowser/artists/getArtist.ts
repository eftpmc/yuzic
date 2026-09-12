import { Artist } from "@/types";
import { makeLocalId } from "@/types/EntityId";
import type { MediaBrowserClient } from "../client";
import { buildCover } from "../brand";
import { MediaBrowserItemsResponse } from "../types";

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

  const raw = await client.request<MediaBrowserItemsResponse>(path);
  const artistRaw = raw?.Items?.[0];

  if (!artistRaw) {
    throw new Error("Artist not found");
  }

  const cover = buildCover(client.brand, artistRaw.Id);

  const mbid = artistRaw.ProviderIds?.MusicBrainz ?? null;
  const id = artistRaw.Id ?? "";
  const sourceServerId = client.serverId;

  return {
    id,
    name: artistRaw.Name ?? "Unknown Artist",
    cover,
    subtext: "Artist",
    mbid,
    albumIds: [],
    localId: sourceServerId
      ? makeLocalId({ kind: "artist", sourceServerId, serverItemId: id })
      : undefined,
    libraryState: "in-library",
  };
}
