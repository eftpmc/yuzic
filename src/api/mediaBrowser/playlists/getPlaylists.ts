import { PlaylistBase } from "@/types";
import type { MediaBrowserClient } from "../client";
import { buildCover } from "../brand";
import { MediaBrowserItem, MediaBrowserItemsResponse } from "../types";

export type GetPlaylistsResult = PlaylistBase[];

async function fetchGetPlaylists(client: MediaBrowserClient) {
  const path =
    `/Users/${client.userId}/Items` +
    `?IncludeItemTypes=Playlist` +
    `&Recursive=true` +
    `&Fields=Id,Name,PrimaryImageTag`;
  return client.request<MediaBrowserItemsResponse>(path);
}

function normalizePlaylistEntry(p: MediaBrowserItem, client: MediaBrowserClient): PlaylistBase {
  const id = p.Id ?? "";

  const cover = buildCover(client.brand, id);

  return {
    id,
    cover,
    title: p.Name ?? "Playlist",
    subtext: "Playlist",
    changed: new Date(p.DateLastMediaAdded ?? 0),
    created: new Date(p.DateCreated ?? 0),
  };
}

export async function getPlaylists(client: MediaBrowserClient): Promise<GetPlaylistsResult> {
  const raw = await fetchGetPlaylists(client);
  const items = raw?.Items ?? [];
  return items.map((p) =>
    normalizePlaylistEntry(p, client)
  );
}
