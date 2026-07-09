import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';

export function useUnstarAlbum() {
  const api = useApi();
  const queryClient = useQueryClient();
  const activeServer = useSelector(selectActiveServer);

  return useMutation({
    mutationFn: async (albumId: string) => {
      await api.starred.remove(albumId, 'album');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.Starred, activeServer?.id] });
    },
  });
}
