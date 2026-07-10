import type { NavidromeClient } from "../client";
import { SubsonicResponse } from "../types";

export async function renamePlaylist(
  client: NavidromeClient,
  playlistId: string,
  newName: string
): Promise<void> {
  const raw = await client.request<SubsonicResponse>(
    "updatePlaylist.view",
    { playlistId, name: newName },
    { method: "POST" }
  );
  const status = raw?.["subsonic-response"]?.status;
  if (status !== "ok") {
    throw new Error("Failed to rename playlist");
  }
}
