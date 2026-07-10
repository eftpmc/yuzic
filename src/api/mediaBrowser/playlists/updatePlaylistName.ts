import type { MediaBrowserClient } from "../client";

export async function updatePlaylistName(
  client: MediaBrowserClient,
  playlistId: string,
  newName: string
): Promise<void> {
  await client.request(`/Items/${playlistId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Id: playlistId, Name: newName }),
  });
}
