import type { JellyfinClient } from "../client";

export async function updatePlaylistName(
  client: JellyfinClient,
  playlistId: string,
  newName: string
): Promise<void> {
  await client.request(`/Items/${playlistId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Id: playlistId, Name: newName }),
  });
}
