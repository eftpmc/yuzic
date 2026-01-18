import { AlbumBase, LastfmConfig } from '@/types';
import { createLastfmClient } from '../client';

const normalizeLastFmAlbum = (album: any): AlbumBase => ({
  id: album.mbid || album.url || album.name,
  title: album.name,
  cover: {
    kind: 'lastfm',
    url:
      album.image?.find((i: any) => i.size === 'large')?.['#text'] ??
      '',
  },
  subtext: album.artist ?? '',
  artist: {
    id: '',
    cover: { kind: 'none' },
    name: album.artist ?? '',
    subtext: 'Artist',
  },
  year: 2000,
  genres: [],
  userPlayCount: 0,
});

export const searchAlbums = async (
  config: LastfmConfig,
  query: string
): Promise<AlbumBase[]> => {
  if (!query.trim()) return [];

  try {
    const { request } = createLastfmClient(config);

    const res = await request<{
      results?: {
        albummatches?: {
          album?: any[];
        };
      };
    }>({
      method: 'album.search',
      album: query,
      limit: '25',
    });

    const albums = res.results?.albummatches?.album;

    if (!Array.isArray(albums)) return [];

    return albums.map(normalizeLastFmAlbum);
  } catch (error) {
    console.warn(`❌ Last.fm album.search failed for "${query}":`, error);
    return [];
  }
};