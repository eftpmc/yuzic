import { CoverSource, PlaylistBase } from "@/types";
import type { JellyfinClient } from "../client";

export type GetPlaylistsResult = PlaylistBase[];

async function fetchGetPlaylists(client: JellyfinClient) {
  const path =
    `/Users/${client.userId}/Items` +
    `?IncludeItemTypes=Playlist` +
    `&Recursive=true` +
    `&Fields=Id,Name,PrimaryImageTag`;
  return client.request<any>(path);
}

function normalizePlaylistEntry(p: any): PlaylistBase {
  const id = p.Id;

  const cover: CoverSource = id
        ? { kind: "jellyfin", itemId: id }
        : { kind: "none" };

  return {
    id,
    cover,
    title: p.Name ?? "Playlist",
    subtext: "Playlist",
    changed: new Date(p.DateLastMediaAdded),
    created: new Date(p.DateCreated),
  };
}

export async function getPlaylists(client: JellyfinClient): Promise<GetPlaylistsResult> {
  const raw = await fetchGetPlaylists(client);
  const items = raw?.Items ?? [];
  return items.map((p: any) =>
    normalizePlaylistEntry(p)
  );
}
