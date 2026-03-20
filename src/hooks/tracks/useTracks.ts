import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { QueryKeys } from "@/enums/queryKeys";
import { SongBase } from "@/types";
import { useApi } from "@/api";
import { staleTime } from "@/constants/staleTime";
import { selectActiveServer } from "@/utils/redux/selectors/serversSelectors";
import { useLibrary } from "@/contexts/LibraryContext";

type UseTracksResult = {
  tracks: SongBase[];
  isLoading: boolean;
  error: Error | null;
};

export function useTracks(): UseTracksResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { tracks: libraryTracks } = useLibrary();

  const query = useQuery<SongBase[], Error>({
    queryKey: [QueryKeys.Tracks, activeServer?.id],
    queryFn: api.tracks.list,
    enabled: !!activeServer?.id,
    staleTime: staleTime.tracks,
  });

  return {
    tracks: query.data ?? libraryTracks,
    isLoading: query.isLoading && libraryTracks.length === 0,
    error: query.error ?? null,
  };
}
