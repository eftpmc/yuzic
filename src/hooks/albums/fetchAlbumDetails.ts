import type { QueryClient } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { staleTime } from '@/constants/staleTime';
import type { Album, AlbumBase } from '@/types';

type FetchAlbumDetailsArgs = {
  queryClient: QueryClient;
  serverId: string;
  albums: AlbumBase[];
  getAlbum: (id: string) => Promise<Album>;
};

export async function fetchAlbumDetailsSettled({
  queryClient,
  serverId,
  albums,
  getAlbum,
}: FetchAlbumDetailsArgs): Promise<Album[]> {
  const results = await Promise.allSettled(
    albums.map(album =>
      queryClient.fetchQuery({
        queryKey: [QueryKeys.Album, serverId, album.id],
        queryFn: () => getAlbum(album.id),
        staleTime: staleTime.albums,
      })
    )
  );

  return results
    .map(result => result.status === 'fulfilled' ? result.value : null)
    .filter((album): album is Album => Boolean(album));
}
