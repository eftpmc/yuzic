import { AlbumBase, CoverSource } from "@/types";
import { makeLocalId } from "@/types/EntityId";
import type { NavidromeClient } from "../client";
import { SubsonicAlbumListEntry, SubsonicResponse } from "../types";

export type GetAlbumListResult = AlbumBase[];

export function normalizeAlbumEntry(a: SubsonicAlbumListEntry, sourceServerId?: string): AlbumBase {
  const cover: CoverSource =
  a.coverArt
    ? { kind: 'navidrome', coverArtId: a.coverArt }
    : { kind: 'none' };

  const artistId = a.artistId ?? "unknown";
  const artist = {
    id: artistId,
    cover: { kind: "none" as const },
    name: a.artist ?? "Unknown Artist",
    subtext: "Artist",
    localId: sourceServerId
      ? makeLocalId({ kind: 'artist', sourceServerId, serverItemId: artistId })
      : undefined,
  }

  const serverLastPlayedAt = a.played ? new Date(a.played).getTime() : undefined;
  const albumId = a.id ?? "";

  return {
    id: albumId,
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
    localId: sourceServerId
      ? makeLocalId({ kind: 'album', sourceServerId, serverItemId: albumId })
      : undefined,
    libraryState: "in-library",
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
    all.push(...page.map((a) => normalizeAlbumEntry(a, client.serverId)));
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}
