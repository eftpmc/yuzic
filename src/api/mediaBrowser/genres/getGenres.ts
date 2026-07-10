import type { MediaBrowserClient } from "../client";
import { MediaBrowserItemsResponse } from "../types";

export type GetGenresResult = string[];

function normalizeGenreItems(raw: MediaBrowserItemsResponse): GetGenresResult {
  const items = raw?.Items ?? [];
  return items
    .map((g) => g?.Name)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
}

export async function getGenres(client: MediaBrowserClient): Promise<GetGenresResult> {
  const path = `/Genres` + (client.parentId ? `?ParentId=${encodeURIComponent(client.parentId)}` : "");
  const raw = await client.request<MediaBrowserItemsResponse>(path);
  return normalizeGenreItems(raw);
}
