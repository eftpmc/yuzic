import { createMusicBrainzClient } from '../client';
import { ExternalSong } from '@/types';

export async function getReleaseTracks(
  releaseId: string
): Promise<ExternalSong[]> {
  try {
    const { request } = createMusicBrainzClient();

    const release = await request<any>(
      `release/${releaseId}`,
      {
        inc: 'recordings',
      }
    );

    const media = release.media ?? [];

    const tracks = media.flatMap((m: any) =>
      (m.tracks ?? []).map((t: any, index: number) => ({
        id: t.recording?.id ?? t.id,
        title: t.title,
        duration: t.length ?? 0,
        trackNumber: index + 1,
      }))
    );

    return tracks;
  } catch (err) {
    console.warn(
      `MusicBrainz getReleaseTracks failed for ${releaseId}`,
      err
    );
    return [];
  }
}