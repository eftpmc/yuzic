import { EmbyClient } from "../client";

export async function markPlayed(
  client: EmbyClient,
  itemId: string
): Promise<void> {
  await client.request(
    `/Users/${encodeURIComponent(client.userId)}/PlayedItems/${encodeURIComponent(itemId)}`,
    { method: 'POST' }
  );
}
