import { ListenBrainzConfig } from '@/types';
import { createListenBrainzClient } from './client';

export async function submitNowPlaying(
  config: ListenBrainzConfig,
  payload: { artist: string; track: string; durationSeconds?: number }
) {
  const client = createListenBrainzClient(config);

  const trackMetadata: Record<string, unknown> = {
    artist_name: payload.artist,
    track_name: payload.track,
    additional_info: {
      media_player: 'Yuzic',
      submission_client: 'Yuzic',
      ...(payload.durationSeconds != null && payload.durationSeconds > 0
        ? { duration_ms: Math.round(payload.durationSeconds * 1000) }
        : {}),
    },
  };

  return client.request('/submit-listens', {
    method: 'POST',
    body: {
      listen_type: 'playing_now',
      payload: [{ track_metadata: trackMetadata }],
    },
    auth: true,
  });
}
