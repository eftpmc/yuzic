import type { EmbyClient } from "../client";

export type GetGenresResult = string[];

function normalizeGenreItems(raw: any): GetGenresResult {
  const items = raw?.Items ?? [];
  return items
    .map((g: any) => g?.Name)
    .filter((name: any): name is string => typeof name === "string" && name.length > 0);
}

export async function getGenres(client: EmbyClient): Promise<GetGenresResult> {
  const path = `/Genres` + (client.parentId ? `?ParentId=${encodeURIComponent(client.parentId)}` : "");
  const raw = await client.request<any>(path);
  return normalizeGenreItems(raw);
}
