import { JellyfinClient } from "../client";

export async function markPlayed(
  client: JellyfinClient,
  itemId: string
): Promise<void> {
  await client.request(
    `/Users/${encodeURIComponent(client.userId)}/PlayedItems/${encodeURIComponent(itemId)}`,
    { method: 'POST' }
  );
}
