import { ExternalAlbumBase, LastfmConfig } from '@/types';
import { createLastfmClient } from '../client';
import { nanoid } from 'nanoid/non-secure';

const normalizeLastFmAlbum = (album: any): ExternalAlbumBase => ({
  id: album.mbid || `lastfm:album:${nanoid()}`,
  title: album.name,
  artist: album.artist ?? '',
  subtext: album.artist ?? '',
  cover:
    album.image?.find((i: any) => i.size === 'extralarge')?.['#text']
      ? {
          kind: 'lastfm',
          url: album.image.find((i: any) => i.size === 'extralarge')['#text'],
        }
      : album.image?.find((i: any) => i.size === 'large')?.['#text']
      ? {
          kind: 'lastfm',
          url: album.image.find((i: any) => i.size === 'large')['#text'],
        }
      : { kind: 'none' },
});

export const searchAlbums = async (
  config: LastfmConfig,
  query: string
): Promise<ExternalAlbumBase[]> => {
  if (!query.trim()) return [];

  try {
    const { request } = createLastfmClient(config);

    const res = await request<{
      results?: { albummatches?: { album?: any[] } };
    }>({
      method: 'album.search',
      album: query,
      limit: '25',
    });

    const albums = res.results?.albummatches?.album;
    return Array.isArray(albums)
      ? albums.map(normalizeLastFmAlbum)
      : [];
  } catch (error) {
    console.warn(`❌ Last.fm album.search failed for "${query}":`, error);
    return [];
  }
};