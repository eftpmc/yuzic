import { AlbumBase } from '@/types/Album';
import { Artist } from '@/types/Artist';
import { Song } from '@/types/Song';
import type { EmbyClient } from '../client';

export async function search(
  client: EmbyClient,
  query: string
): Promise<{ albums: AlbumBase[]; artists: Artist[]; songs: Song[] }> {
  if (!query.trim()) {
    return { albums: [], artists: [], songs: [] };
  }

  const [albumsRes, artistsRes, songsRes] = await Promise.allSettled([
    client.request<any>(
      `/Items?SearchTerm=${encodeURIComponent(query)}&IncludeItemTypes=MusicAlbum&Recursive=true&Limit=20&Fields=DateCreated,ProviderIds,ArtistItems`,
      { tokenOnly: true }
    ),
    client.request<any>(
      `/Items?SearchTerm=${encodeURIComponent(query)}&IncludeItemTypes=MusicArtist&Recursive=true&Limit=20&Fields=ProviderIds`,
      { tokenOnly: true }
    ),
    client.request<any>(
      `/Users/${encodeURIComponent(client.userId)}/Items?SearchTerm=${encodeURIComponent(query)}&IncludeItemTypes=Audio&Recursive=true&Limit=20&Fields=RunTimeTicks,ArtistItems,AlbumId`,
      { tokenOnly: true }
    ),
  ]);

  const albumItems = albumsRes.status === 'fulfilled' ? (albumsRes.value.Items ?? []) : [];
  const artistItems = artistsRes.status === 'fulfilled' ? (artistsRes.value.Items ?? []) : [];
  const songItems = songsRes.status === 'fulfilled' ? (songsRes.value.Items ?? []) : [];

  const albums: AlbumBase[] = albumItems.map((item: any) => ({
    id: item.Id,
    title: item.Name,
    subtext: item.Artists?.[0] ?? '',
    artist: {
      id: item.AlbumArtistId ?? item.Id,
      name: item.AlbumArtist ?? '',
      subtext: '',
      cover: {
        kind: 'emby',
        itemId: item.Id,
      },
      mbid: item.ArtistItems?.[0]?.ProviderIds?.MusicBrainz ?? null,
    },
    cover: {
      kind: 'emby',
      itemId: item.Id,
    },
    year: item.ProductionYear ?? 0,
    genres: item.Genres ?? [],
    created: item.DateCreated ? new Date(item.DateCreated) : new Date(0),
    mbid: item.ProviderIds?.MusicBrainzAlbum ?? item.ProviderIds?.MusicBrainz ?? null,
  }));

  const artists: Artist[] = artistItems.map((item: any) => ({
    id: item.Id,
    name: item.Name ?? 'Unknown Artist',
    subtext: 'Artist',
    cover: item.Id
      ? { kind: 'emby' as const, itemId: item.Id }
      : { kind: 'none' as const },
    mbid: item.ProviderIds?.MusicBrainz ?? null,
    albumIds: [],
  }));

  const songs: Song[] = songItems
    .filter((item: any) => item?.Id)
    .map((item: any) => {
      const artistItem = item.ArtistItems?.[0];
      return {
        id: item.Id,
        title: item.Name ?? 'Unknown',
        artist: artistItem?.Name ?? 'Unknown Artist',
        artistId: artistItem?.Id ?? '',
        albumId: item.AlbumId ?? '',
        cover: (item.AlbumId && item.AlbumPrimaryImageTag)
          ? { kind: 'emby' as const, itemId: item.AlbumId, tag: item.AlbumPrimaryImageTag }
          : { kind: 'none' as const },
        duration: String(Math.floor((item.RunTimeTicks ?? 0) / 10_000_000)),
        streamUrl: client.buildStreamUrl(item.Id),
      };
    });

  return { albums, artists, songs };
}
