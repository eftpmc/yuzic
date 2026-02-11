import type { NavidromeClient } from "../client";

export interface AddSongToPlaylistResult {
  success: boolean;
}

export async function addSongToPlaylist(
  client: NavidromeClient,
  playlistId: string,
  songId: string
): Promise<AddSongToPlaylistResult> {
  const raw = await client.request<any>(
    "updatePlaylist.view",
    { playlistId, songIdToAdd: songId },
    { method: "POST" }
  );
  const status = raw?.["subsonic-response"]?.status;
  return { success: status === "ok" };
}