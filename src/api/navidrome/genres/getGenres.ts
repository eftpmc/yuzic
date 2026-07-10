import type { NavidromeClient } from "../client";
import { SubsonicResponse } from "../types";

export type GetGenresResult = string[];

function normalizeGenreItems(raw: SubsonicResponse): GetGenresResult {
  const genres = raw?.["subsonic-response"]?.genres?.genre ?? [];
  return genres.map((g) => g.value).filter((x): x is string => !!x);
}

export async function getGenres(
  client: NavidromeClient
): Promise<GetGenresResult> {
  const raw = await client.request<SubsonicResponse>("getGenres.view");
  return normalizeGenreItems(raw);
}
