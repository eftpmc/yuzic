import { Artist, CoverSource } from "@/types";
import type { NavidromeClient } from "../client";

export type GetArtistsResult = Artist[];

function normalizeArtistEntry(a: any): Artist {
  const cover: CoverSource = a.coverArt
    ? { kind: "navidrome", coverArtId: a.coverArt }
    : { kind: "none" };
  return {
    id: a.id,
    cover,
    name: a.name,
    subtext: "Artist",
    albumIds: [],
  };
}

export async function getArtists(
  client: NavidromeClient
): Promise<GetArtistsResult> {
  const raw = await client.request<any>("getArtists.view");
  const indexes = raw?.["subsonic-response"]?.artists?.index;
  if (!indexes) return [];
  const flattened = indexes.flatMap((bucket: any) => bucket.artist || []);
  return flattened.map((a: any) => normalizeArtistEntry(a));
}
