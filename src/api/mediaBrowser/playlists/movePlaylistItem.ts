import type { MediaBrowserClient } from "../client";

/** Move a playlist entry to a zero-based position. */
export async function movePlaylistItem(
  client: MediaBrowserClient,
  playlistId: string,
  entryId: string,
  newIndex: number
): Promise<void> {
  const path = `/Playlists/${playlistId}/Items/${entryId}/Move/${newIndex}`;
  await client.request(path, { method: "POST" });
}
