import { lastfmRequest } from './client';
import type { LastFmConfig } from './client';

export async function updateNowPlaying(
  config: LastFmConfig,
  payload: { artist: string; track: string; duration?: number }
) {
  const params: Record<string, string> = {
    method: 'track.updateNowPlaying',
    artist: payload.artist,
    track: payload.track,
  };
  if (payload.duration != null && payload.duration > 0) {
    params.duration = String(Math.round(payload.duration));
  }

  return lastfmRequest(params, {
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    sessionKey: config.sessionKey,
    signed: true,
  });
}
