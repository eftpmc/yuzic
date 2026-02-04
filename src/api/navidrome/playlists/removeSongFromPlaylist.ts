import type { NavidromeClient } from "../client";

export interface RemoveSongFromPlaylistResult {
  success: boolean;
}

export async function removeSongFromPlaylist(
  client: NavidromeClient,
  playlistId: string,
  songIndex: string
): Promise<RemoveSongFromPlaylistResult> {
  const raw = await client.request<any>(
    "updatePlaylist.view",
    { playlistId, songIndexToRemove: songIndex },
    { method: "POST" }
  );
  const status = raw?.["subsonic-response"]?.status;
  return { success: status === "ok" };
}