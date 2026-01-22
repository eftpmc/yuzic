import { AlbumBase } from '@/types/Album';
import { ArtistBase } from '@/types/Artist';

export async function search(
  serverUrl: string,
  token: string,
  query: string
): Promise<{ albums: AlbumBase[]; artists: ArtistBase[] }> {
  if (!query.trim()) {
    return { albums: [], artists: [] };
  }

  const url =
    `${serverUrl}/Items` +
    `?SearchTerm=${encodeURIComponent(query)}` +
    `&IncludeItemTypes=MusicAlbum` +
    `&Recursive=true`;

  const res = await fetch(url, {
    headers: {
      'X-Emby-Token': token,
    },
  });

  const data = await res.json();
  const items = data.Items ?? [];

  const albums: AlbumBase[] = items.map((item: any) => ({
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
  }));

  return {
    albums,
    artists: [],
  };
}