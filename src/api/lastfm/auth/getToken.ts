import { lastfmRequest } from '../client'

export async function getToken(apiKey: string): Promise<string> {
  const data = await lastfmRequest<{ token: string }>(
    { method: 'auth.getToken' },
    { apiKey }
  )
  return data.token
}

export function buildAuthUrl(apiKey: string, token: string): string {
  return `https://www.last.fm/api/auth/?api_key=${apiKey}&token=${token}`
}
