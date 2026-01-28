import { ExternalAlbumBase } from '@/types';
import { createMusicBrainzClient } from '../client';

const normalizeReleaseGroup = (rg: any): ExternalAlbumBase => ({
  id: rg.id,
  title: rg.title,
  artist: rg['artist-credit']?.[0]?.name ?? '',
  subtext: rg['artist-credit']?.[0]?.name ?? '',
  cover: {
    kind: 'musicbrainz',
    releaseGroupId: rg.id,
  },
});

export const searchAlbums = async (
  query: string
): Promise<ExternalAlbumBase[]> => {
  if (!query.trim()) return [];

  try {
    const { request } = createMusicBrainzClient();

    const res = await request<{
      'release-groups'?: any[];
    }>('release-group', {
      query,
      limit: '25',
    });

    return Array.isArray(res['release-groups'])
      ? res['release-groups'].map(normalizeReleaseGroup)
      : [];
  } catch (error) {
    console.warn(`MusicBrainz release-group search failed for "${query}":`, error);
    return [];
  }
};