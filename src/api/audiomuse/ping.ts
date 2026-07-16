import { createAudiomuseClient, type AudiomuseClient, type AudiomuseConfig } from './client';
export async function ping(client: AudiomuseClient): Promise<boolean> {
  try {
    // AudioMuse exposes /api/health as its liveness endpoint. /api/status is
    // reserved for /api/status/<task_id>.
    await client.request('/api/health');
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
