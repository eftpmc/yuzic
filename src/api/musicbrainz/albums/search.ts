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

    const STOPWORDS = new Set([
      'a', 'an', 'the', 'is', 'it', 'its', 'if', 'of', 'in', 'on',
      'at', 'to', 'for', 'and', 'or', 'not', 'be', 'been', 'are',
      'was', 'were', 'by', 'as', 'do', 'so', 'my', 'me', 'we',
    ]);

    const allTerms = query
      .replace(/"/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const terms = allTerms.filter(t => !STOPWORDS.has(t.toLowerCase()));
    const effectiveTerms = terms.length > 0 ? terms : allTerms;

    const lucene = effectiveTerms
      .map(t => `(releasegroup:${t}* OR artistname:${t}*)`)
      .join(' AND ');

    const res = await request<{
      'release-groups'?: any[];
    }>('release-group', {
      query: `${lucene} AND primarytype:Album`,
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