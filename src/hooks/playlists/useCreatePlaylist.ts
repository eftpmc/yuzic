import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';

export function useCreatePlaylist() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      return api.playlists.create(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.Playlists],
      });
    },
  });
}