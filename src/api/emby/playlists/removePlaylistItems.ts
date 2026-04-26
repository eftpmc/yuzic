import type { EmbyClient } from "../client";

export async function removePlaylistItems(
  client: EmbyClient,
  playlistId: string,
  entryIds: string[]
): Promise<void> {
  const ids = entryIds.join(",");
  const path = `/Playlists/${playlistId}/Items?EntryIds=${ids}`;
  await client.request(path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
}
