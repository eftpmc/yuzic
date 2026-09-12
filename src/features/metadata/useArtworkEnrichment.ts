import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { resolveArtwork } from '@/features/metadata/resolveArtwork';
import { metadataArtworkFetchers } from '@/features/metadata/enrichmentFetchers';
import { selectEnabledMetadataArtworkSourcesInOrder } from '@/utils/redux/selectors/settingsSelectors';
import { QueryKeys } from '@/enums/queryKeys';
import type { CoverSource } from '@/types/Cover';

type Input = {
  name: string;
  mbid?: string | null;
  mbidType?: 'release' | 'release-group' | 'unknown';
  /** Whether the caller's own (server/Deezer) artwork is already present —
   *  the enrichment lookup is GAPS ONLY, so it stays disabled whenever this
   *  is true, matching `resolveArtwork`'s never-override guarantee at the
   *  call site as well as inside the resolver. */
  hasOwnArtwork: boolean;
};

export type ArtworkEnrichment = {
  cover: CoverSource | null;
  sourceLabel: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  deezer: 'Deezer',
  coverartarchive: 'Cover Art Archive',
};

/**
 * `metadata.enrich` (artwork half) for display at an artwork site (the
 * artist-image header, currently). Returns `{ cover: null, sourceLabel: null
 * }` whenever enrichment is off, the server already has artwork, or every
 * enabled source misses — in every one of those cases the caller's existing
 * (server) cover/placeholder is what gets shown, which is the "disabling
 * restores the server view" guarantee.
 */
export function useArtworkEnrichment({ name, mbid, mbidType, hasOwnArtwork }: Input): ArtworkEnrichment {
  const enabledSourcesInOrder = useSelector(selectEnabledMetadataArtworkSourcesInOrder);
  const enabled = !hasOwnArtwork && !!name && enabledSourcesInOrder.length > 0;

  const query = useQuery({
    queryKey: [QueryKeys.MetadataArtwork, name, mbid ?? '', enabledSourcesInOrder.join(',')],
    enabled,
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'online',
    queryFn: () =>
      resolveArtwork({
        entity: { name, mbid, mbidType },
        enabledSourcesInOrder: enabledSourcesInOrder as never[],
        fetchers: metadataArtworkFetchers,
      }),
  });

  if (!enabled || !query.data) {
    return { cover: null, sourceLabel: null };
  }

  return {
    cover: query.data.cover,
    sourceLabel: SOURCE_LABELS[query.data.source] ?? query.data.source,
  };
}
