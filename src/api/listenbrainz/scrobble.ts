import { ListenBrainzConfig } from '@/types';
import { createListenBrainzClient } from './client';

export type ScrobblePayload = {
  artist: string;
  track: string;
  listenedAt?: number;
};

export async function submitScrobble(
  config: ListenBrainzConfig,
  payload: ScrobblePayload
) {
  const client = createListenBrainzClient(config);

  const body = {
    listen_type: 'single',
    payload: [
      {
        listened_at: payload.listenedAt ?? Math.floor(Date.now() / 1000),
        track_metadata: {
          artist_name: payload.artist,
          track_name: payload.track,
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
