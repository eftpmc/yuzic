import { createMusicBrainzClient } from '../client';

export type Release = {
  id: string;
  date?: string;
};

export async function getCanonicalRelease(
  releaseGroupId: string
): Promise<Release | null> {
  try {
    const { request } = createMusicBrainzClient();

    const res = await request<{
      releases?: any[];
    }>('release', {
      'release-group': releaseGroupId,
      status: 'official',
      limit: '5',
    });

    const releases = res.releases ?? [];
    if (!releases.length) return null;

    releases.sort((a, b) => {
      const ay = a.date ?? '9999';
      const by = b.date ?? '9999';
      return ay.localeCompare(by);
    });

    return {
      id: releases[0].id,
      date: releases[0].date,
    };
  } catch (err) {
    console.warn(
      `MusicBrainz getCanonicalRelease failed for ${releaseGroupId}`,
      err
    );
    return null;
  }
}