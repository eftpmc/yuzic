import { createNavidromeClient, type NavidromeClientConfig } from '../client';

export async function scrobble(
  config: NavidromeClientConfig,
  songId: string,
  startTime: number
): Promise<void> {
  const client = createNavidromeClient(config);
  await client.request('scrobble.view', {
    id: songId,
    time: startTime,
    submission: 'true',
  });
}
