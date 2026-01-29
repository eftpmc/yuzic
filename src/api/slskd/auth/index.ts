import { createSlskdClient, SlskdConfig } from '../client';

/**
 * Test connection to slskd (GET /application).
 * Uses same pattern as Explo: SLSKD_URL + SLSKD_API_KEY.
 * @see https://github.com/LumePart/Explo/wiki/3.-Configuration-Parameters
 */
export async function testConnection(config: SlskdConfig): Promise<boolean> {
  const client = createSlskdClient(config);
  await client.request<unknown>('/application');
  return true;
}
