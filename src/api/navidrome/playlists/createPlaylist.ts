import type { NavidromeClient } from "../client";
import { SubsonicResponse } from "../types";

export interface CreatePlaylistResult {
  id: string | null;
}

export async function createPlaylist(
  client: NavidromeClient,
  name: string
): Promise<CreatePlaylistResult> {
  const raw = await client.request<SubsonicResponse>(
    "createPlaylist.view",
    { name },
    { method: "POST" }
  );
  const response = raw?.["subsonic-response"];
  const id = response?.playlist?.id ?? response?.playlistId ?? null;
  return { id };
}