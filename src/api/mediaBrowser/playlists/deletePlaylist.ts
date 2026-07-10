import type { MediaBrowserClient } from "../client";

export async function deletePlaylist(
  client: MediaBrowserClient,
  playlistId: string
): Promise<void> {
  await client.request(`/Playlists/${playlistId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
}
