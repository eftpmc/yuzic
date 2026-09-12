import { Artist, CoverSource } from "@/types";
import { makeLocalId } from "@/types/EntityId";
import type { NavidromeClient } from "../client";
import { SubsonicArtist, SubsonicResponse } from "../types";

export type GetArtistsResult = Artist[];

function normalizeArtistEntry(a: SubsonicArtist, sourceServerId?: string): Artist {
  const cover: CoverSource = a.coverArt
    ? { kind: "navidrome", coverArtId: a.coverArt }
    : { kind: "none" };
  const id = a.id ?? "";
  return {
    id,
    cover,
    name: a.name ?? "Unknown Artist",
    subtext: "Artist",
    albumIds: [],
    localId: sourceServerId
      ? makeLocalId({ kind: "artist", sourceServerId, serverItemId: id })
      : undefined,
    libraryState: "in-library",
  };
}

export async function getArtists(
  client: NavidromeClient
): Promise<GetArtistsResult> {
  const raw = await client.request<SubsonicResponse>("getArtists.view");
  const indexes = raw?.["subsonic-response"]?.artists?.index;
  if (!indexes) return [];
  const flattened = indexes.flatMap((bucket) => bucket.artist ?? []);
  return flattened.map((a) => normalizeArtistEntry(a, client.serverId));
}
