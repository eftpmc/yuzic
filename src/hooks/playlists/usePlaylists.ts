import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { Playlist } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';

type UsePlaylistsResult = {
    playlists: Playlist[];
    isLoading: boolean;
    error: Error | null;
};

export function usePlaylists(): UsePlaylistsResult {
    const api = useApi();
    const activeServer = useSelector(selectActiveServer);
    const { playlists: libraryPlaylists } = useLibrary();

    const query = useQuery<Playlist[], Error>({
        queryKey: [QueryKeys.Playlists, activeServer?.id],
        queryFn: api.playlists.list,
        enabled: !!activeServer?.id,
        staleTime: staleTime.playlists,
    });

    return {
        playlists: query.data ?? libraryPlaylists,
        isLoading: query.isLoading && libraryPlaylists.length === 0,
        error: query.error ?? null,
    };
}

