import { ExternalArtistBase } from '@/types';
import { createMusicBrainzClient } from '../client';

export async function getArtist(
  artistMbid: string
): Promise<ExternalArtistBase | null> {
  try {
    const { request } = createMusicBrainzClient();

    const artist = await request<any>(`artist/${artistMbid}`);

    return {
      id: artist.id,
      name: artist.name,
      subtext: artist.area?.name ?? '',
      cover: { kind: 'musicbrainz' },
    };
  } catch (err) {
    console.warn(
      `MusicBrainz getArtist failed for ${artistMbid}`,
      err
    );
    return null;
  }
}