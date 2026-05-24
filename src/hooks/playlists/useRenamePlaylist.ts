import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { renameLibraryPlaylist } from '@/utils/redux/slices/librarySlice';

export function useRenamePlaylist() {
  const api = useApi();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);

  return useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      await api.playlists.rename(id, newName);
    },
    onSuccess: (_, { id, newName }) => {
      dispatch(renameLibraryPlaylist({ id, newName }));
      queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlists, activeServer?.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlist, activeServer?.id, id] });
    },
  });
}
