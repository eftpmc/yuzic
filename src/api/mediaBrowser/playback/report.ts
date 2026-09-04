import type { MediaBrowserClient } from '../client';

// Jellyfin's tick unit is 100-nanosecond intervals — a track at 42 seconds is
// 42 * 10_000_000 ticks. Server-side scrobbler plugins (last.fm, listenbrainz)
// listen for these session events, so a scrobble to Last.fm through Jellyfin
// starts here.
const MS_TO_TICKS = 10_000;

function ticksFromMs(ms: number): number {
  return Math.max(0, Math.floor(ms) * MS_TO_TICKS);
}

export async function reportPlaybackStart(
  client: MediaBrowserClient,
  itemId: string,
  positionMs: number
): Promise<void> {
  await client.request('/Sessions/Playing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ItemId: itemId,
      PositionTicks: ticksFromMs(positionMs),
      IsPaused: false,
      PlayMethod: 'DirectStream',
    }),
  });
}

export async function reportPlaybackProgress(
  client: MediaBrowserClient,
  itemId: string,
  positionMs: number,
  isPaused: boolean
): Promise<void> {
  await client.request('/Sessions/Playing/Progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ItemId: itemId,
      PositionTicks: ticksFromMs(positionMs),
      IsPaused: isPaused,
      PlayMethod: 'DirectStream',
      EventName: isPaused ? 'Pause' : 'TimeUpdate',
    }),
  });
}

export async function reportPlaybackStop(
  client: MediaBrowserClient,
  itemId: string,
  positionMs: number
): Promise<void> {
  await client.request('/Sessions/Playing/Stopped', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ItemId: itemId,
      PositionTicks: ticksFromMs(positionMs),
    }),
  });
}
