import { createLastfmClient } from '../client';
import { LastfmConfig } from '@/types';

export type LastfmTestResult =
  | { success: true }
  | { success: false; message: string };

export async function testConnection(
  config: LastfmConfig
): Promise<LastfmTestResult> {
  try {
    const { request } = createLastfmClient(config);

    // Cheapest safe request: artist.getInfo on a known artist
    await request({
      method: 'artist.getinfo',
      artist: 'Radiohead',
    });

    return { success: true };
  } catch (e: any) {
    return {
      success: false,
      message: e?.message ?? 'Failed to connect to Last.fm',
    };
  }
}