import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { PlaylistBase } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';

type UsePlaylistsResult = {
    playlists: PlaylistBase[];
    isLoading: boolean;
    error: Error | null;
};

export function usePlaylists(): UsePlaylistsResult {
    const api = useApi();

    const query = useQuery<PlaylistBase[], Error>({
        queryKey: [QueryKeys.Playlists],
        queryFn: api.playlists.list,
        staleTime: staleTime.playlists,
    });

    return {
        playlists: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error ?? null,
    };
}

export async function fetchPlaylist(id: string) {
    const api = useApi();

    return api.playlists.get(id);
}