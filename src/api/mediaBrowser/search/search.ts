import { AlbumBase } from '@/types/Album';
import { Artist } from '@/types/Artist';
import { Song } from '@/types/Song';
import type { MediaBrowserClient } from '../client';
import { buildCover, buildSongCover } from '../brand';
import { MediaBrowserItemsResponse } from '../types';

export async function search(
  client: MediaBrowserClient,
  query: string
): Promise<{ albums: AlbumBase[]; artists: Artist[]; songs: Song[] }> {
  if (!query.trim()) {
    return { albums: [], artists: [], songs: [] };
  }

  const [albumsRes, artistsRes, songsRes] = await Promise.allSettled([
    client.request<MediaBrowserItemsResponse>(
      `/Items?SearchTerm=${encodeURIComponent(query)}&IncludeItemTypes=MusicAlbum&Recursive=true&Limit=20&Fields=DateCreated,ProviderIds,ArtistItems`,
      { tokenOnly: true }
    ),
    client.request<MediaBrowserItemsResponse>(
      `/Items?SearchTerm=${encodeURIComponent(query)}&IncludeItemTypes=MusicArtist&Recursive=true&Limit=20&Fields=ProviderIds`,
      { tokenOnly: true }
    ),
    client.request<MediaBrowserItemsResponse>(
      `/Users/${encodeURIComponent(client.userId)}/Items?SearchTerm=${encodeURIComponent(query)}&IncludeItemTypes=Audio&Recursive=true&Limit=20&Fields=RunTimeTicks,ArtistItems,AlbumId`,
      { tokenOnly: true }
    ),
  ]);

  const albumItems = albumsRes.status === 'fulfilled' ? (albumsRes.value.Items ?? []) : [];
  const artistItems = artistsRes.status === 'fulfilled' ? (artistsRes.value.Items ?? []) : [];
  const songItems = songsRes.status === 'fulfilled' ? (songsRes.value.Items ?? []) : [];

  const albums: AlbumBase[] = albumItems.map((item) => ({
    id: item.Id ?? '',
    title: item.Name ?? '',
    subtext: item.Artists?.[0] ?? '',
    artist: {
      id: item.AlbumArtistId ?? item.Id ?? '',
      name: item.AlbumArtist ?? '',
      subtext: '',
      cover: buildCover(client.brand, item.Id),
      mbid: item.ArtistItems?.[0]?.ProviderIds?.MusicBrainz ?? null,
    },
    cover: buildCover(client.brand, item.Id),
    year: item.ProductionYear ?? 0,
    genres: item.Genres ?? [],
    created: item.DateCreated ? new Date(item.DateCreated) : new Date(0),
    mbid: item.ProviderIds?.MusicBrainzAlbum ?? item.ProviderIds?.MusicBrainz ?? null,
  }));

  const artists: Artist[] = artistItems.map((item) => ({
    id: item.Id ?? '',
    name: item.Name ?? 'Unknown Artist',
    subtext: 'Artist',
    cover: buildCover(client.brand, item.Id),
    mbid: item.ProviderIds?.MusicBrainz ?? null,
    albumIds: [],
  }));

  const songs: Song[] = songItems
    .filter((item): item is typeof item & { Id: string } => !!item?.Id)
    .map((item) => {
      const artistItem = item.ArtistItems?.[0];
      return {
        id: item.Id,
        title: item.Name ?? 'Unknown',
        artist: artistItem?.Name ?? 'Unknown Artist',
        artistId: artistItem?.Id ?? '',
        albumId: item.AlbumId ?? '',
        cover: buildSongCover(client.brand, item.Id, item.AlbumId, item.AlbumPrimaryImageTag ?? undefined),
        duration: String(Math.floor((item.RunTimeTicks ?? 0) / 10_000_000)),
        streamUrl: client.buildStreamUrl(item.Id),
      };
    });

  return { albums, artists, songs };
}
