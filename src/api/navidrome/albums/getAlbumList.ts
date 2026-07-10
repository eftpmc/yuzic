import { AlbumBase, CoverSource } from "@/types";
import type { NavidromeClient } from "../client";
import { SubsonicAlbumListEntry, SubsonicResponse } from "../types";

export type GetAlbumListResult = AlbumBase[];

export function normalizeAlbumEntry(a: SubsonicAlbumListEntry): AlbumBase {
  const cover: CoverSource =
  a.coverArt
    ? { kind: 'navidrome', coverArtId: a.coverArt }
    : { kind: 'none' };

  const artist = {
    id: a.artistId ?? "unknown",
    cover: { kind: "none" as const },
    name: a.artist ?? "Unknown Artist",
    subtext: "Artist",
  }

  const serverLastPlayedAt = a.played ? new Date(a.played).getTime() : undefined;

  return {
    id: a.id ?? "",
    cover,
    title: a.title ?? "Unknown Album",
    subtext:
      (a.songCount ?? 0) > 1
        ? `Album • ${a.artist}`
        : `Single • ${a.artist}`,
    artist,
    year: a.year ?? 0,
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
    const raw = await client.request<SubsonicResponse>("getAlbumList.view", { type, size: PAGE_SIZE, offset });
    const page = raw?.["subsonic-response"]?.albumList?.album ?? [];
    all.push(...page.map(normalizeAlbumEntry));
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}
