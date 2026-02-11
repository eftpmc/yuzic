import type { JellyfinClient } from "../client";

export async function unstar(
  client: JellyfinClient,
  itemId: string
): Promise<void> {
  await client.request(`/Users/${client.userId}/FavoriteItems/${itemId}`, {
    method: "DELETE",
    headers: {
      Authorization: `MediaBrowser Token=${client.token}`,
      "Content-Type": "application/json",
    },
  });
}
