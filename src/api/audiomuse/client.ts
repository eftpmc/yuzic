export interface AudiomuseConfig {
  serverUrl: string;
  apiToken: string;
}

export type AudiomuseClient = ReturnType<typeof createAudiomuseClient>;

export function createAudiomuseClient(config: AudiomuseConfig) {
  const { serverUrl, apiToken } = config;

  if (!serverUrl || !apiToken) {
    throw new Error('AudioMuse-AI not configured');
  }

  const baseUrl = serverUrl.replace(/\/$/, '');

  async function request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
        ...(options.headers as Record<string, string> ?? {}),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AudioMuse-AI API error (${res.status}): ${text}`);
    }

    return res.json();
  }

  return { request, baseUrl };
}
