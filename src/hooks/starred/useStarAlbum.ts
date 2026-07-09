import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';

// Unlike song starring, this has no offline queue — favoriting an album is
// a lower-frequency action than favoriting a song, so it simply requires
// being online rather than adding a second offline-mutation-replay path.
export function useStarAlbum() {
  const api = useApi();
  const queryClient = useQueryClient();
  const activeServer = useSelector(selectActiveServer);

  return useMutation({
    mutationFn: async (albumId: string) => {
      await api.starred.add(albumId, 'album');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.Starred, activeServer?.id] });
    },
  });
}
