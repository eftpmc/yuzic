import type { AudiomuseClient } from './client';
import {
  normalizeAudiomuseSimilarityResult,
  type AudiomuseSimilarityResult,
  type AudiomuseTrackRef,
} from './types';

export async function getAudiomuseQueueExtension(
  client: AudiomuseClient,
  opts: { seedItemIds: string[]; excludeItemIds: string[]; limit?: number }
): Promise<AudiomuseTrackRef[]> {
  const limit = opts.limit ?? 20;
  const exclude = new Set(opts.excludeItemIds);
  const refs: AudiomuseTrackRef[] = [];

  // AudioMuse's public similarity API accepts one seed item per request.
  // Query newest seeds first and stop once enough unique results exist.
  for (const seedItemId of [...opts.seedItemIds].reverse()) {
    const query = new URLSearchParams({
      item_id: seedItemId,
      n: String(limit),
      eliminate_duplicates: 'true',
      radius_similarity: 'true',
    });
    const raw = await client.request<AudiomuseSimilarityResult>(
      `/api/similar_tracks?${query.toString()}`
    );

    for (const ref of normalizeAudiomuseSimilarityResult(raw)) {
      if (!exclude.has(ref.itemId) && !refs.some(existing => existing.itemId === ref.itemId)) {
        refs.push(ref);
      }
      if (refs.length >= limit) return refs;
    }
  }

  return refs;
}
