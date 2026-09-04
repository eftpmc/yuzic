import type { ApiAdapter } from '@/api/types';
import type { Song } from '@/types';
import { createAudiomuseClient, type AudiomuseConfig } from '@/api/audiomuse/client';
import { getAudiomuseQueueExtension } from '@/api/audiomuse/similarity';

/**
 * Turns "make a playlist from this seed" into three server-round-trips:
 *
 *   1. Ask AudioMuse for N acoustically-similar tracks.
 *   2. Create a new playlist on the media server with a descriptive name.
 *   3. Add the seed + the similar tracks to that playlist, in order.
 *
 * Returns the new playlist's id so the caller can navigate to it.
 *
 * Throws instead of returning null on failure so the caller can distinguish
 * "AudioMuse had nothing to add" (empty return) from "we couldn't reach the
 * server" (thrown).
 */
export async function generateSimilarPlaylist(
  api: ApiAdapter,
  audiomuse: AudiomuseConfig,
  seed: Song,
  opts: { size?: number; name?: string } = {}
): Promise<{ playlistId: string; trackCount: number }> {
  const size = Math.max(1, opts.size ?? 25);
  const client = createAudiomuseClient(audiomuse);

  const similar = await getAudiomuseQueueExtension(client, {
    seedItemIds: [seed.id],
    excludeItemIds: [seed.id],
    limit: size,
  });

  const trackIds = [seed.id, ...similar.map((t) => t.itemId).filter((id) => id && id !== seed.id)];

  const name = opts.name ?? `Similar to ${seed.title}`;
  const playlistId = await api.playlists.create(name);

  // add-one-at-a-time keeps this compatible with every server that only
  // accepts single-song add; the seed is added first so it stays at the top.
  for (const id of trackIds) {
    try {
      await api.playlists.addSong(playlistId, id);
    } catch {
      // Missing library entry / non-navidrome id — skip. A track AudioMuse
      // knows about might not be in the user's own library, and that's OK.
    }
  }

  return { playlistId, trackCount: trackIds.length };
}
