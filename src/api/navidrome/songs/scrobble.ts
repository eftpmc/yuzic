import { NavidromeClient } from "../client";

export async function scrobble(
  client: NavidromeClient,
  songId: string,
  timestamp: number
): Promise<void> {
  await client.request('scrobble.view', { id: songId, time: timestamp, submission: 'true' });
}
