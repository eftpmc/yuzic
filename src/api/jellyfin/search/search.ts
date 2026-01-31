import { AlbumBase } from '@/types/Album';
import { ArtistBase } from '@/types/Artist';

const headers = (token: string) => ({
  'X-Emby-Token': token,
});

export async function search(
  serverUrl: string,
  token: string,
  query: string
): Promise<{ albums: AlbumBase[]; artists: ArtistBase[] }> {
  if (!query.trim()) {
    return { albums: [], artists: [] };
  }

  const [albumsRes, artistsRes] = await Promise.all([
    fetch(
      `${serverUrl}/Items` +
        `?SearchTerm=${encodeURIComponent(query)}` +
        `&IncludeItemTypes=MusicAlbum` +
        `&Recursive=true` +
        `&Fields=DateCreated`,
      { headers: headers(token) }
    ),
    fetch(
      `${serverUrl}/Items` +
        `?SearchTerm=${encodeURIComponent(query)}` +
        `&IncludeItemTypes=MusicArtist` +
        `&Recursive=true`,
      { headers: headers(token) }
    ),
  ]);

  const [albumsData, artistsData] = await Promise.all([
    albumsRes.json(),
    artistsRes.json(),
  ]);

  const albumItems = albumsData.Items ?? [];
  const artistItems = artistsData.Items ?? [];

  const albums: AlbumBase[] = albumItems.map((item: any) => ({
    id: item.Id,
    title: item.Name,
    subtext: item.Artists?.[0] ?? '',
    artist: {
      id: item.AlbumArtistId ?? item.Id,
      name: item.AlbumArtist ?? '',
      subtext: '',
      cover: {
        kind: 'jellyfin',
        itemId: item.Id,
      },
    },
    cover: {
      kind: 'jellyfin',
      itemId: item.Id,
    },
    year: item.ProductionYear ?? 0,
    genres: item.Genres ?? [],
    created: item.DateCreated ? new Date(item.DateCreated) : new Date(0),
  }));

  const artists: ArtistBase[] = artistItems.map((item: any) => ({
    id: item.Id,
    name: item.Name ?? 'Unknown Artist',
    subtext: 'Artist',
    cover: item.Id
      ? { kind: 'jellyfin' as const, itemId: item.Id }
      : { kind: 'none' as const },
  }));

  return { albums, artists };
}