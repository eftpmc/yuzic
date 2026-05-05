import { lastfmRequest, LastFmConfig } from './client'

export type LastFmScrobblePayload = {
  artist: string
  track: string
  timestamp: number
  duration?: number
}

export async function submitScrobble(
  config: LastFmConfig & { sessionKey: string },
  payload: LastFmScrobblePayload
): Promise<void> {
  const params: Record<string, string> = {
    method: 'track.scrobble',
    artist: payload.artist,
    track: payload.track,
    timestamp: String(payload.timestamp),
  }
  if (payload.duration != null && payload.duration > 0) {
    params.duration = String(Math.round(payload.duration))
  }

  await lastfmRequest(params, {
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    sessionKey: config.sessionKey,
    signed: true,
  })
}
