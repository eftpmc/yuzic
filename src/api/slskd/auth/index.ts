import { createSlskdClient, SlskdConfig } from '../client';

export async function testConnection(config: SlskdConfig): Promise<boolean> {
  const client = createSlskdClient(config);
  await client.request<unknown>('/application');
  return true;
}
