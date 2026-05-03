import { useSelector } from "react-redux";
import { QueryKeys } from "@/enums/queryKeys";
import { SongBase } from "@/types";
import { useApi } from "@/api";
import { staleTime } from "@/constants/staleTime";
import { selectActiveServer } from "@/utils/redux/selectors/serversSelectors";
import { useLibrary } from "@/contexts/LibraryContext";
import { hasArrayData, useOfflineFirstQuery } from "@/hooks/useOfflineFirstQuery";

type UseTracksResult = {
  tracks: SongBase[];
  isLoading: boolean;
  error: Error | null;
};

export function useTracks(): UseTracksResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { tracks: libraryTracks } = useLibrary();

  const query = useOfflineFirstQuery<SongBase[]>({
    queryKey: [QueryKeys.Tracks, activeServer?.id],
    queryFn: api.tracks.list,
    enabled: !!activeServer?.id,
    staleTime: staleTime.tracks,
    fallbackData: libraryTracks,
    hasFallbackData: hasArrayData,
    preferFallbackWhenQueryEmpty: true,
  });

  return {
    tracks: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
