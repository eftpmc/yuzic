import { Artist, CoverSource } from "@/types";
import { makeLocalId } from "@/types/EntityId";
import type { NavidromeClient } from "../client";
import { SubsonicResponse } from "../types";

export type GetArtistResult = Artist | null;

export async function getArtist(
  client: NavidromeClient,
  artistId: string
): Promise<GetArtistResult> {
  const raw = await client.request<SubsonicResponse>("getArtist.view", { id: artistId });
  const artist = raw?.["subsonic-response"]?.artist;
  if (!artist) return null;

  const cover: CoverSource = artist.coverArt
    ? { kind: "navidrome", coverArtId: artist.coverArt }
    : { kind: "none" };

  const id = artist.id ?? "";
  const sourceServerId = client.serverId;

  return {
    id,
    name: artist.name ?? "Unknown Artist",
    cover,
    subtext: "Artist",
    albumIds: [],
    localId: sourceServerId
      ? makeLocalId({ kind: "artist", sourceServerId, serverItemId: id })
      : undefined,
    libraryState: "in-library",
  };
}
