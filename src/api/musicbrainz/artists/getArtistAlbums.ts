import { ExternalAlbumBase } from '@/types';
import { createMusicBrainzClient } from '../client';

const normalizeReleaseGroup = (
  rg: any,
  artistName: string
): ExternalAlbumBase => ({
  id: rg.id,
  title: rg.title,
  artist: artistName,
  subtext: artistName,
  cover: { kind: 'musicbrainz', releaseGroupId: rg.id },
});

export async function getArtistAlbums(
  artistMbid: string,
  artistName: string,
  limit = 5
): Promise<ExternalAlbumBase[]> {
  try {
    const { request } = createMusicBrainzClient();

    const res = await request<{
      'release-groups'?: any[];
    }>('release-group', {
      artist: artistMbid,
      type: 'album',
      limit: String(limit)
    });

    const groups = res['release-groups'] ?? [];

    groups.sort((a, b) => {
      const ay = parseInt(a['first-release-date'] ?? '9999', 10);
      const by = parseInt(b['first-release-date'] ?? '9999', 10);
      return ay - by;
    });

    return groups.slice(0, limit).map(rg =>
      normalizeReleaseGroup(rg, artistName)
    );
  } catch (err) {
    console.warn(
      `MusicBrainz getArtistAlbums failed for ${artistMbid}`,
      err
    );
    return [];
  }
}
