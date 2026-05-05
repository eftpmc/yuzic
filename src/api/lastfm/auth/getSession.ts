import { lastfmRequest } from '../client'

type SessionResponse = {
  session: {
    name: string
    key: string
    subscriber: number
  }
}

export async function getSession(
  apiKey: string,
  apiSecret: string,
  token: string
): Promise<{ sessionKey: string; username: string }> {
  const data = await lastfmRequest<SessionResponse>(
    { method: 'auth.getSession', token },
    { apiKey, apiSecret, signed: true }
  )
  return {
    sessionKey: data.session.key,
    username: data.session.name,
  }
}
