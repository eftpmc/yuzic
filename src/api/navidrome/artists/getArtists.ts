import { ArtistBase, CoverSource } from "@/types";
import type { NavidromeClient } from "../client";

export type GetArtistResult = ArtistBase;
export type GetArtistsResult = ArtistBase[];

function normalizeArtistEntry(a: any): GetArtistResult {
  const cover: CoverSource = a.coverArt
    ? { kind: "navidrome", coverArtId: a.coverArt }
    : { kind: "none" };
  return {
    id: a.id,
    cover,
    name: a.name,
    subtext: "Artist",
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