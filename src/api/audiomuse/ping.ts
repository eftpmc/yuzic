import { createAudiomuseClient, type AudiomuseClient, type AudiomuseConfig } from './client';
import type { AudiomusePingResult } from './types';

// GUESS — endpoint path unverified, confirm against a live AudioMuse-AI
// instance before relying on this beyond a connection-test UI.
export async function ping(client: AudiomuseClient): Promise<boolean> {
  try {
    await client.request<AudiomusePingResult>('/api/status');
    return true;
  } catch {
    return false;
  }
}

export async function testConnection(config: AudiomuseConfig): Promise<void> {
  const client = createAudiomuseClient(config);
  const ok = await ping(client);
  if (!ok) throw new Error('AudioMuse-AI connection failed');
}
