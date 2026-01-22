import { ExternalArtistBase } from '@/types';
import { createMusicBrainzClient } from '../client';

const normalizeArtist = (artist: any): ExternalArtistBase => ({
  id: artist.id,
  name: artist.name,
  subtext: artist.area?.name ?? '',
  cover: { kind: 'musicbrainz', releaseGroupId: artist.id },
});

export const searchArtists = async (
  query: string
): Promise<ExternalArtistBase[]> => {
  if (!query.trim()) return [];

  try {
    const { request } = createMusicBrainzClient();

    const res = await request<{
      artists?: any[];
    }>('artist', {
      query,
      limit: '10',
    });

    return Array.isArray(res.artists)
      ? res.artists.map(normalizeArtist)
      : [];
  } catch (error) {
    console.warn(
      `MusicBrainz artist search failed for "${query}":`,
      error
    );
    return [];
  }
};