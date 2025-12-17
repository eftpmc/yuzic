import { useApi } from '@/api';

type UseStarredActionsResult = {
  addStar: (id: string) => Promise<void>;
  removeStar: (id: string) => Promise<void>;
};

export function useStarredActions(): UseStarredActionsResult {
  const api = useApi();

  const addStar = async (id: string) => {
    await api.starred.add(id);
  };

  const removeStar = async (id: string) => {
    await api.starred.remove(id);
  };

  return {
    addStar,
    removeStar,
  };
}