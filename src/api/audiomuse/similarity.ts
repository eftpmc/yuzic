import type { AudiomuseClient } from './client';
import type { AudiomuseSimilarityResult, AudiomuseTrackRef } from './types';

// GUESS — endpoint path and payload shape unverified, confirm against a live
// AudioMuse-AI instance. Isolated here so fixing it later is a one-file change;
// callers (queueProviders.ts) only depend on this function's signature.
export async function getAudiomuseQueueExtension(
  client: AudiomuseClient,
  opts: { seedItemIds: string[]; excludeItemIds: string[]; limit?: number }
): Promise<AudiomuseTrackRef[]> {
  const raw = await client.request<AudiomuseSimilarityResult>('/api/dstm/extend', {
    method: 'POST',
    body: JSON.stringify({
      seed_item_ids: opts.seedItemIds,
      exclude_item_ids: opts.excludeItemIds,
      limit: opts.limit ?? 20,
    }),
  });
  return raw.tracks ?? [];
}
