import Constants from 'expo-constants';

import { ListenBrainzConfig } from '@/types';
import { createListenBrainzClient } from './client';

// Read from the app manifest rather than hardcoded: the literal that used to
// live here said 1.1.5 long after the app had moved on, so every listen was
// attributed to a version that no longer existed.
const CLIENT_VERSION = Constants.expoConfig?.version ?? 'unknown';

export type ScrobblePayload = {
  artist: string;
  track: string;
  /** Unix ts when playback started (required by ListenBrainz). */
  listenedAt: number;
  /** Track duration in seconds. Optional; improves matching. */
  durationSeconds?: number;
  /** Seconds actually listened. Optional; improves data quality. */
  durationPlayedSeconds?: number;
};

export async function submitScrobble(
  config: ListenBrainzConfig,
  payload: ScrobblePayload
) {
  const client = createListenBrainzClient(config);

  const additionalInfo: Record<string, unknown> = {
    media_player: 'Yuzic',
    submission_client: 'Yuzic',
    submission_client_version: CLIENT_VERSION,
  };
  if (payload.durationSeconds != null && payload.durationSeconds > 0) {
    additionalInfo.duration_ms = Math.round(payload.durationSeconds * 1000);
  }
  if (payload.durationPlayedSeconds != null && payload.durationPlayedSeconds >= 0) {
    additionalInfo.duration_played = Math.round(payload.durationPlayedSeconds);
  }

  const body = {
    listen_type: 'single',
    payload: [
      {
        listened_at: payload.listenedAt,
        track_metadata: {
          artist_name: payload.artist,
          track_name: payload.track,
          additional_info: additionalInfo,
        },
      },
    ],
  };

  return client.request('/submit-listens', {
    method: 'POST',
    body,
    auth: true,
  });
}
