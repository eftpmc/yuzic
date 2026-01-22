import { createMusicBrainzClient } from '../client';
import { ExternalSong } from '@/types';

export async function getReleaseTracks(
  releaseId: string,
  releaseGroupId: string,
  artistName: string
): Promise<ExternalSong[]> {
  try {
    const { request } = createMusicBrainzClient();

    const release = await request<any>(
      `release/${releaseId}`,
      { inc: 'recordings' }
    );

    const media = release.media ?? [];

    const tracks: ExternalSong[] = media.flatMap((m: any) =>
      (m.tracks ?? []).map((t: any, index: number) => ({
        id: t.recording?.id ?? t.id,
        title: t.title,
        artist: artistName,
        albumId: releaseGroupId,
        duration: String(Math.floor((t.length ?? 0) / 1000)),
        cover: {
          kind: 'musicbrainz',
          releaseGroupId,
        },
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