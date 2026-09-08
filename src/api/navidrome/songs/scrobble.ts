import { NavidromeClient } from "../client";

export async function scrobble(
  client: NavidromeClient,
  songId: string,
  timestamp: number
): Promise<void> {
  await client.request('scrobble.view', { id: songId, time: timestamp, submission: 'true' });
}

/**
 * The same endpoint with `submission=false` — Subsonic's "now playing", not a
 * completed listen. Navidrome forwards it to Last.fm/ListenBrainz for users
 * who configured that server-side.
 */
export async function nowPlaying(
  client: NavidromeClient,
  songId: string
): Promise<void> {
  await client.request('scrobble.view', { id: songId, submission: 'false' });
}
