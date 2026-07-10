import { CoverSource, PlaylistBase } from "@/types";
import type { NavidromeClient } from "../client";
import { SubsonicResponse } from "../types";

export type GetPlaylistsResult = PlaylistBase[];

export async function getPlaylists(
  client: NavidromeClient
): Promise<GetPlaylistsResult> {
  const raw = await client.request<SubsonicResponse>("getPlaylists.view", { size: 500 });
  const list = raw?.["subsonic-response"]?.playlists?.playlist ?? [];

  return list.map((pl) => {
      const cover: CoverSource = pl.coverArt
      ? { kind: "navidrome", coverArtId: pl.coverArt }
      : { kind: "none" };

    return {
      id: pl.id ?? "",
      cover,
      title: pl.name ?? "Playlist",
      subtext: "Playlist",
      changed: new Date(pl.changed ?? 0),
      created: new Date(pl.created ?? 0),
    };
  });
}
