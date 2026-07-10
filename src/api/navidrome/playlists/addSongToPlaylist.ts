import type { NavidromeClient } from "../client";
import { SubsonicResponse } from "../types";

export interface AddSongToPlaylistResult {
  success: boolean;
}

export async function addSongToPlaylist(
  client: NavidromeClient,
  playlistId: string,
  songId: string
): Promise<AddSongToPlaylistResult> {
  const raw = await client.request<SubsonicResponse>(
    "updatePlaylist.view",
    { playlistId, songIdToAdd: songId },
    { method: "POST" }
  );
  const status = raw?.["subsonic-response"]?.status;
  return { success: status === "ok" };
}