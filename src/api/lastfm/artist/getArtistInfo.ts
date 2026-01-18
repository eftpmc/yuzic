import { AlbumBase, LastfmConfig } from '@/types';
import { createLastfmClient } from '../client';

export type GetArtistInfoResult = {
  albums: AlbumBase[];
  bio: string;
  artistUrl: string;
  globalPlayCount: number;
};

const normalizeLastFmAlbum = (album: any): AlbumBase => ({
  id: album.mbid || album.name,
  title: album.name,
  cover: {
    kind: 'lastfm',
    url: album.image?.find((i: any) => i.size === 'large')?.['#text'] ?? '',
  },
  subtext: album.artist?.name ?? album.artist ?? '',
  artist: {
    id: '',
    cover: { kind: 'none' },
    name: album.artist?.name ?? album.artist ?? '',
    subtext: 'Artist',
  },
  year: 2000,
  genres: [],
  userPlayCount: 0,
});

export const getArtistInfo = async (
  config: LastfmConfig,
  artistName: string
): Promise<GetArtistInfoResult> => {
  try {
    const { request } = createLastfmClient(config);

    const [albumsRes, infoRes] = await Promise.all([
      request<{
        topalbums?: { album?: any[] };
      }>({
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

    const albums = Array.isArray(albumsRes.topalbums?.album)
      ? albumsRes.topalbums!.album.map(normalizeLastFmAlbum)
      : [];

    return {
      albums,
      bio: infoRes.artist?.bio?.summary ?? '',
      artistUrl: infoRes.artist?.url ?? '',
      globalPlayCount: Number(infoRes.artist?.stats?.playcount ?? 0),
    };
  } catch (error) {
    console.warn(`❌ Failed to fetch Last.fm data for "${artistName}":`, error);
    return {
      albums: [],
      bio: '',
      artistUrl: '',
      globalPlayCount: 0,
    };
  }
};