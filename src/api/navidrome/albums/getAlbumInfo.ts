import type { NavidromeClient } from "../client";

export interface GetAlbumInfoResult {
  notes: string;
  musicBrainzId: string | null;
  lastFmUrl: string | null;
}

function normalizeGetAlbumInfo(raw: any): GetAlbumInfoResult {
  const info = raw?.["subsonic-response"]?.albumInfo || {};
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
  const raw = await client.request("getAlbumInfo.view", { id: albumId });
  return normalizeGetAlbumInfo(raw);
}