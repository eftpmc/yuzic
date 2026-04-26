import type { EmbyClient } from "../client";

export async function deletePlaylist(
  client: EmbyClient,
  playlistId: string
): Promise<void> {
  await client.request(`/Playlists/${playlistId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
}
