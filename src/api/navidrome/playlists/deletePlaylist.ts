import type { NavidromeClient } from "../client";

export async function deletePlaylist(
  client: NavidromeClient,
  playlistId: string
): Promise<void> {
  const raw = await client.request<any>("deletePlaylist.view", { id: playlistId });
  const status = raw?.["subsonic-response"]?.status;
  if (status !== "ok") {
    throw new Error("Failed to delete playlist");
  }
}
