import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { PlaylistBase } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';
import { hasArrayData, useOfflineFirstQuery } from '@/hooks/useOfflineFirstQuery';

type UsePlaylistsResult = {
    playlists: PlaylistBase[];
    isLoading: boolean;
    error: Error | null;
};

export function usePlaylists(): UsePlaylistsResult {
    const api = useApi();
    const activeServer = useSelector(selectActiveServer);
    const { playlists: libraryPlaylists } = useLibrary();

    const query = useOfflineFirstQuery<PlaylistBase[]>({
        queryKey: [QueryKeys.Playlists, activeServer?.id],
        queryFn: api.playlists.list,
        enabled: !!activeServer?.id,
        staleTime: staleTime.playlists,
        fallbackData: libraryPlaylists,
        hasFallbackData: hasArrayData,
    });

    return {
        playlists: query.data,
        isLoading: query.isLoading,
        error: query.error,
    };
}
