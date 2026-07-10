import { MediaBrowserClient } from "../client";

export async function markPlayed(
  client: MediaBrowserClient,
  itemId: string
): Promise<void> {
  await client.request(
    `/Users/${encodeURIComponent(client.userId)}/PlayedItems/${encodeURIComponent(itemId)}`,
    { method: 'POST' }
  );
}
