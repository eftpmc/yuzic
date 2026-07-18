import { Song } from '@/types';
import type { ApiAdapter } from '@/api/types';
import shuffleArray from '@/utils/shuffleArray';
import { createAudiomuseClient, type AudiomuseConfig } from '@/api/audiomuse/client';
import { getAudiomuseQueueExtension } from '@/api/audiomuse/similarity';

// Tiered source for Smart Shuffle's one-shot injection and Autoplay's
// queue-end extension: AudioMuse-AI's acoustic-analysis-based extension when
// configured, otherwise the app's existing native similar-songs capability
// (Navidrome's getSimilarSongs.view or Jellyfin/Emby's InstantMix, already
// unified behind api.similar).
export interface QueueFillProvider {
  id: 'audiomuse' | 'native-similarity';
  isAvailable(): boolean;
  fetchExtension(opts: {
    recentSongs: { id: string }[];
    excludeIds: Set<string>;
    count: number;
  }): Promise<Song[]>;
}

export function createAudiomuseQueueFillProvider(config: AudiomuseConfig, api: ApiAdapter): QueueFillProvider {
  return {
    id: 'audiomuse',
    isAvailable: () => Boolean(config.serverUrl && config.apiToken),
    fetchExtension: async ({ recentSongs, excludeIds, count }) => {
      const client = createAudiomuseClient(config);
      const refs = await getAudiomuseQueueExtension(client, {
        seedItemIds: recentSongs.map(s => s.id),
        excludeItemIds: [...excludeIds],
        limit: count,
      });
      // AudioMuse returns track references keyed to the active media server's
      // native item ids, not full Song objects — resolve each one, dropping
      // any that fail rather than failing the whole batch.
      const resolved = await Promise.allSettled(refs.map(ref => api.songs.get(ref.itemId)));
      return resolved
        .filter((r): r is PromiseFulfilledResult<Song | null> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter((s): s is Song => s !== null && !excludeIds.has(s.id));
    },
  };
}

export function createNativeSimilarityQueueFillProvider(api: ApiAdapter): QueueFillProvider {
  return {
    id: 'native-similarity',
    isAvailable: () => true,
    fetchExtension: async ({ recentSongs, excludeIds, count }) => {
      const seed = recentSongs[recentSongs.length - 1];
      if (!seed) return [];
      const similar = await api.similar.getSimilarSongs(seed.id);
      return shuffleArray(similar.filter(s => !excludeIds.has(s.id))).slice(0, count);
    },
  };
}

// Returns the first available provider in priority order (AudioMuse-AI
// first, native fallback last), or null if none are available.
export function resolveQueueFillProvider(providers: QueueFillProvider[]): QueueFillProvider | null {
  return providers.find(p => p.isAvailable()) ?? null;
}
