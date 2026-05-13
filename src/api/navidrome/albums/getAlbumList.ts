import { AlbumBase, CoverSource } from "@/types";
import type { NavidromeClient } from "../client";

export type GetAlbumListResult = AlbumBase[];

function normalizeAlbumEntry(a: any): AlbumBase {
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

  const serverLastPlayedAt = a.played ? new Date(a.played).getTime() : undefined;

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
    serverPlayCount: a.playCount ?? undefined,
    serverLastPlayedAt: serverLastPlayedAt && !isNaN(serverLastPlayedAt) ? serverLastPlayedAt : undefined,
  };
}

const PAGE_SIZE = 500;

export async function getAlbumList(
  client: NavidromeClient,
  type = "newest"
): Promise<GetAlbumListResult> {
  const all: AlbumBase[] = [];
  let offset = 0;

  while (true) {
    const raw = await client.request<any>("getAlbumList.view", { type, size: PAGE_SIZE, offset });
    const page: any[] = raw?.["subsonic-response"]?.albumList?.album ?? [];
    all.push(...page.map(normalizeAlbumEntry));
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}
