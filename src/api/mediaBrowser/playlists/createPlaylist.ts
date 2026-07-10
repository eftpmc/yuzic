import type { MediaBrowserClient } from "../client";
import { MediaBrowserItem } from "../types";

export async function createPlaylist(
  client: MediaBrowserClient,
  name: string
): Promise<string | null> {
  const json = await client.request<MediaBrowserItem>("/Playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Name: name,
      UserId: client.userId,
      MediaType: "Audio",
    }),
  });
  return json?.Id ?? null;
}
