import type { NavidromeClient } from "../client";

export type GetGenresResult = string[];

function normalizeGenreItems(raw: any): GetGenresResult {
  const genres = raw?.["subsonic-response"]?.genres?.genre ?? [];
  return genres.map((g: any) => g.value).filter((x: any) => !!x);
}

export async function getGenres(
  client: NavidromeClient
): Promise<GetGenresResult> {
  const raw = await client.request<any>("getGenres.view");
  return normalizeGenreItems(raw);
}
