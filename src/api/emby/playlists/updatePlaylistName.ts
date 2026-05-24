import type { EmbyClient } from "../client";

export async function updatePlaylistName(
  client: EmbyClient,
  playlistId: string,
  newName: string
): Promise<void> {
  await client.request(`/Items/${playlistId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Id: playlistId, Name: newName }),
  });
}
