import { createMusicBrainzClient } from '../client';
import { ExternalAlbum } from '@/types';

/**
 * Fetch a release with all details in one request. Use when we have a release ID
 * (e.g. from Navidrome/Jellyfin). Avoids multi-step resolution.
 */
export async function getReleaseWithDetails(
  releaseId: string
): Promise<ExternalAlbum | null> {
  try {
    const { request } = createMusicBrainzClient();

    const release = await request<any>(
      `release/${releaseId}`,
      { inc: 'release-groups+recordings+artist-credits' }
    );

    const rg = release['release-group'];
    if (!rg?.id) return null;

    const artist =
      release['artist-credit']?.[0]?.name ??
      rg['artist-credit']?.[0]?.name ??
      'Unknown Artist';

    const artistMbid: string | null =
      release['artist-credit']?.[0]?.artist?.id ??
      rg['artist-credit']?.[0]?.artist?.id ??
      null;

    const media = release.media ?? [];
    const songs = media.flatMap((m: any) =>
      (m.tracks ?? []).map((t: any) => ({
        id: t.recording?.id ?? t.id,
        title: t.title,
        artist,
        albumId: rg.id,
        duration: String(Math.floor((t.length ?? 0) / 1000)),
        cover: { kind: 'musicbrainz' as const, releaseGroupId: rg.id },
      }))
    );

    return {
      id: rg.id,
      title: rg.title ?? release.title,
      artist,
      artistMbid,
      subtext: artist,
      cover: { kind: 'musicbrainz', releaseGroupId: rg.id },
      songs,
    };
  } catch (err) {
    console.warn(
      `MusicBrainz getReleaseWithDetails failed for ${releaseId}`,
      err
    );
    return null;
  }
}
