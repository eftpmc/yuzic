import type { JellyfinClient } from "../client";

export async function deletePlaylist(
  client: JellyfinClient,
  playlistId: string
): Promise<void> {
  await client.request(`/Playlists/${playlistId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
}
