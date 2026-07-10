import type { MediaBrowserClient } from "../client";

export async function addPlaylistItems(
  client: MediaBrowserClient,
  playlistId: string,
  itemIds: string[]
): Promise<void> {
  const ids = itemIds.join(",");
  const path = `/Playlists/${playlistId}/Items?Ids=${ids}&UserId=${client.userId}`;
  await client.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}
