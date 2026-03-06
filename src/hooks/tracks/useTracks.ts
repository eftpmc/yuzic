import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { QueryKeys } from "@/enums/queryKeys";
import { SongBase } from "@/types";
import { useApi } from "@/api";
import { staleTime } from "@/constants/staleTime";
import { selectActiveServer } from "@/utils/redux/selectors/serversSelectors";

type UseTracksResult = {
  tracks: SongBase[];
  isLoading: boolean;
  error: Error | null;
};

export function useTracks(): UseTracksResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);

  const query = useQuery<SongBase[], Error>({
    queryKey: [QueryKeys.Tracks, activeServer?.id],
    queryFn: api.tracks.list,
    enabled: !!activeServer?.id,
    staleTime: staleTime.tracks,
  });

  return {
    tracks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}
