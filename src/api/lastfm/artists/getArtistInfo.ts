import { CoverSource, ExternalAlbumBase, LastfmConfig } from '@/types';
import { createLastfmClient } from '../client';
import { nanoid } from 'nanoid/non-secure';

export type GetArtistInfoResult = {
  albums: ExternalAlbumBase[];
  bio: string;
  artistUrl: string;
  globalPlayCount: number;
};

const normalizeLastFmImage = (images?: any[]): CoverSource => {
  if (!Array.isArray(images)) return { kind: 'none' };

  const preferred =
    images.find(i => i.size === 'extralarge') ||
    images.find(i => i.size === 'large') ||
    images.find(i => i.size === 'medium') ||
    images.find(i => i.size === 'small');

  return preferred?.['#text']
    ? { kind: 'lastfm', url: preferred['#text'] }
    : { kind: 'none' };
};

const normalizeLastFmAlbum = (album: any): ExternalAlbumBase => ({
  id: album.mbid || `lastfm:${nanoid()}`,
  title: album.name,
  artist: album.artist?.name ?? album.artist ?? '',
  subtext: album.artist?.name ?? album.artist ?? '',
  cover: normalizeLastFmImage(album.image),
});

export const getArtistInfo = async (
  config: LastfmConfig,
  artistName: string
): Promise<GetArtistInfoResult> => {
  try {
    const { request } = createLastfmClient(config);

    const [albumsRes, infoRes] = await Promise.all([
      request<{ topalbums?: { album?: any[] } }>({
        method: 'artist.gettopalbums',
        artist: artistName,
      }),
      request<{
        artist?: {
          bio?: { summary?: string };
          url?: string;
          stats?: { playcount?: string };
        };
      }>({
        method: 'artist.getinfo',
        artist: artistName,
      }),
    ]);

    return {
      albums: Array.isArray(albumsRes.topalbums?.album)
        ? albumsRes.topalbums.album.map(normalizeLastFmAlbum)
        : [],
      bio: infoRes.artist?.bio?.summary ?? '',
      artistUrl: infoRes.artist?.url ?? '',
      globalPlayCount: Number(infoRes.artist?.stats?.playcount ?? 0)
    };
  } catch (error) {
    console.warn(
      `❌ Failed to fetch Last.fm data for "${artistName}":`,
      error
    );
    return {
      albums: [],
      bio: '',
      artistUrl: '',
      globalPlayCount: 0
    };
  }
};