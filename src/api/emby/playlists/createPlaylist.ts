import type { EmbyClient } from "../client";

export async function createPlaylist(
  client: EmbyClient,
  name: string
): Promise<string | null> {
  const json = await client.request<any>("/Playlists", {
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
