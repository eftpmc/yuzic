import { Artist, CoverSource } from "@/types";
import type { NavidromeClient } from "../client";

export type GetArtistResult = Artist | null;

export async function getArtist(
  client: NavidromeClient,
  artistId: string
): Promise<GetArtistResult> {
  const raw = await client.request<any>("getArtist.view", { id: artistId });
  const artist = raw?.["subsonic-response"]?.artist;
  if (!artist) return null;

  const cover: CoverSource = artist.coverArt
    ? { kind: "navidrome", coverArtId: artist.coverArt }
    : { kind: "none" };

  return {
    id: artist.id,
    name: artist.name,
    cover,
    subtext: "Artist",
    albumIds: [],
  };
}
