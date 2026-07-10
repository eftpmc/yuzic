import type { NavidromeClient } from "../client";
import { SubsonicResponse } from "../types";

export interface GetAlbumInfoResult {
  notes: string;
  musicBrainzId: string | null;
  lastFmUrl: string | null;
}

function normalizeGetAlbumInfo(raw: SubsonicResponse): GetAlbumInfoResult {
  const info = raw?.["subsonic-response"]?.albumInfo ?? {};
  return {
    notes: info.notes ?? "",
    musicBrainzId: info.musicBrainzId ?? null,
    lastFmUrl: info.lastFmUrl ?? null,
  };
}

export async function getAlbumInfo(
  client: NavidromeClient,
  albumId: string
): Promise<GetAlbumInfoResult> {
  const raw = await client.request<SubsonicResponse>("getAlbumInfo.view", { id: albumId });
  return normalizeGetAlbumInfo(raw);
}
