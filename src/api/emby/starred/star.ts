import type { EmbyClient } from "../client";

export async function star(
  client: EmbyClient,
  itemId: string
): Promise<boolean> {
  await client.request(`/Users/${client.userId}/FavoriteItems/${itemId}`, {
    method: "POST",
    headers: {
      Authorization: `MediaBrowser Token=${client.token}`,
      "Content-Type": "application/json",
    },
  });
  return true;
}
