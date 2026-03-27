import { Album, CoverSource } from "@/types";
import type { NavidromeClient } from "../client";

export type GetAlbumListResult = Album[];

function normalizeAlbumEntry(a: any): Album {
  const cover: CoverSource =
  a.coverArt
    ? { kind: 'navidrome', coverArtId: a.coverArt }
    : { kind: 'none' };

  const artist = {
    id: a.artistId,
    cover: { kind: "none" as const },
    name: a.artist,
    subtext: "Artist",
  }

  return {
    id: a.id,
    cover,
    title: a.title,
    subtext:
      a.songCount > 1
        ? `Album • ${a.artist}`
        : `Single • ${a.artist}`,
    artist,
    year: a.year,
    genres: a.genre ? [a.genre] : [],
    created: a.created ? new Date(a.created) : new Date(0),
    songs: [],
  };
}

export async function getAlbumList(
  client: NavidromeClient,
  type = "newest",
  size = 500
): Promise<GetAlbumListResult> {
  const raw = await client.request<any>("getAlbumList.view", { type, size });
  const albums = raw?.["subsonic-response"]?.albumList?.album ?? [];
  return albums.map((a: any) => normalizeAlbumEntry(a));
}
