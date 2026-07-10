import { PlaylistBase } from "@/types";
import type { MediaBrowserClient } from "../client";
import { buildCover } from "../brand";

export type GetPlaylistsResult = PlaylistBase[];

async function fetchGetPlaylists(client: MediaBrowserClient) {
  const path =
    `/Users/${client.userId}/Items` +
    `?IncludeItemTypes=Playlist` +
    `&Recursive=true` +
    `&Fields=Id,Name,PrimaryImageTag`;
  return client.request<any>(path);
}

function normalizePlaylistEntry(p: any, client: MediaBrowserClient): PlaylistBase {
  const id = p.Id;

  const cover = buildCover(client.brand, id);

  return {
    id,
    cover,
    title: p.Name ?? "Playlist",
    subtext: "Playlist",
    changed: new Date(p.DateLastMediaAdded),
    created: new Date(p.DateCreated),
  };
}

export async function getPlaylists(client: MediaBrowserClient): Promise<GetPlaylistsResult> {
  const raw = await fetchGetPlaylists(client);
  const items = raw?.Items ?? [];
  return items.map((p: any) =>
    normalizePlaylistEntry(p, client)
  );
}
