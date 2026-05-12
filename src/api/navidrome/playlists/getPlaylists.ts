import { CoverSource, PlaylistBase } from "@/types";
import type { NavidromeClient } from "../client";

export type GetPlaylistsResult = PlaylistBase[];

export async function getPlaylists(
  client: NavidromeClient
): Promise<GetPlaylistsResult> {
  const raw = await client.request<any>("getPlaylists.view", { size: 500 });
  const list = raw?.["subsonic-response"]?.playlists?.playlist || [];

  return list.map((pl: any) => {
      const cover: CoverSource = pl.coverArt
      ? { kind: "navidrome", coverArtId: pl.coverArt }
      : { kind: "none" };

    return {
      id: pl.id,
      cover,
      title: pl.name ?? "Playlist",
      subtext: "Playlist",
      changed: new Date(pl.changed),
      created: new Date(pl.created),
    };
  });
}
