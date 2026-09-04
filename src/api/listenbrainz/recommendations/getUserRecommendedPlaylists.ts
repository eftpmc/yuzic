import type { ListenBrainzConfig } from '@/types';
import { createListenBrainzClient } from '../client';

export type LBRecommendedPlaylist = {
  identifier: string;
  title: string;
  description?: string;
  updated?: string;
  trackCount?: number;
};

type PlaylistsResponse = {
  playlists?: Array<{
    playlist?: {
      identifier?: string;
      title?: string;
      annotation?: string;
      date?: string;
      extension?: {
        'https://musicbrainz.org/doc/jspf#playlist'?: {
          track_count?: number;
        };
      };
    };
  }>;
};

/**
 * Weekly Exploration, Weekly Jams, Daily Jams — LB curates a handful of
 * playlists for each user weekly/daily. This lists them; a follow-up fetch
 * on `identifier` loads the tracks.
 */
export async function getUserRecommendedPlaylists(
  config: ListenBrainzConfig
): Promise<LBRecommendedPlaylist[]> {
  const client = createListenBrainzClient(config);
  const path = `/user/${encodeURIComponent(config.username)}/playlists/recommendations`;
  const res = await client.request<PlaylistsResponse>(path);
  const items = res?.playlists ?? [];
  return items
    .map((entry) => entry.playlist)
    .filter((p): p is NonNullable<typeof p> => !!p && typeof p.identifier === 'string' && typeof p.title === 'string')
    .map((p) => ({
      identifier: p.identifier!,
      title: p.title!,
      description: p.annotation ?? undefined,
      updated: p.date ?? undefined,
      trackCount: p.extension?.['https://musicbrainz.org/doc/jspf#playlist']?.track_count ?? undefined,
    }));
}
