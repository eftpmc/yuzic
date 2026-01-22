import { createMusicBrainzClient } from '../client';

export type ReleaseGroup = {
  id: string;
  title: string;
  artist: string;
};

export async function getReleaseGroup(
  releaseGroupId: string
): Promise<ReleaseGroup | null> {
  try {
    const { request } = createMusicBrainzClient();

    const rg = await request<any>(
      `release-group/${releaseGroupId}`,
      {
        inc: 'artist-credits'
      }
    );

    return {
      id: rg.id,
      title: rg.title,
      artist:
        rg['artist-credit']?.[0]?.name ??
        'Unknown Artist',
    };
  } catch (err) {
    console.warn(
      `MusicBrainz getReleaseGroup failed for ${releaseGroupId}`,
      err
    );
    return null;
  }
}