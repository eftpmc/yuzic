export interface SlskdConfig {
  serverUrl: string;
  apiKey: string;
}

export function createSlskdClient(config: SlskdConfig) {
  const { serverUrl, apiKey } = config;

  if (!serverUrl || !apiKey) {
    throw new Error('slskd not configured');
  }

  const baseUrl = `${serverUrl.replace(/\/$/, '')}/api/v0`;

  async function request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'X-API-Key': apiKey,
        ...(options.headers as Record<string, string> ?? {}),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`slskd API error (${res.status}): ${text}`);
    }

    return res.json();
  }

  return { request, baseUrl };
}
