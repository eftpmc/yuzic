import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { resolveArtistInfo } from '@/features/metadata/resolveArtistInfo';
import { metadataArtistInfoFetchers } from '@/features/metadata/enrichmentFetchers';
import { selectEnabledMetadataArtistInfoSourcesInOrder } from '@/utils/redux/selectors/settingsSelectors';
import { QueryKeys } from '@/enums/queryKeys';

type Input = {
  name: string;
  mbid?: string | null;
  /** Whether the caller's own (server/Deezer) bio is already present — the
   *  enrichment lookup is GAPS ONLY, so it stays disabled whenever this is
   *  true, matching `resolveArtistInfo`'s never-override guarantee at the
   *  call site as well as inside the resolver. */
  hasOwnBio: boolean;
};

export type ArtistInfoEnrichment = {
  bio: string | null;
  sourceLabel: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  lastfm: 'Last.fm',
};

/**
 * `metadata.enrich` (artist-info half) for display in `BioSection`. Returns
 * `{ bio: null, sourceLabel: null }` whenever enrichment is off, the server
 * already has a bio, or every enabled source misses — in every one of those
 * cases the caller's existing (server) bio is what gets shown, which is the
 * "disabling restores the server view" guarantee.
 */
export function useArtistInfoEnrichment({ name, mbid, hasOwnBio }: Input): ArtistInfoEnrichment {
  const enabledSourcesInOrder = useSelector(selectEnabledMetadataArtistInfoSourcesInOrder);
  const enabled = !hasOwnBio && !!name && enabledSourcesInOrder.length > 0;

  const query = useQuery({
    queryKey: [QueryKeys.MetadataArtistInfo, name, enabledSourcesInOrder.join(',')],
    enabled,
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'online',
    queryFn: () =>
      resolveArtistInfo({
        artist: { name, mbid },
        enabledSourcesInOrder: enabledSourcesInOrder as never[],
        fetchers: metadataArtistInfoFetchers,
      }),
  });

  if (!enabled || !query.data) {
    return { bio: null, sourceLabel: null };
  }

  return {
    bio: query.data.bio,
    sourceLabel: SOURCE_LABELS[query.data.source] ?? query.data.source,
  };
}
