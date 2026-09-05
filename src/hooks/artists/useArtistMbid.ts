import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'

import { searchArtist } from '@/api/musicbrainz'
import { QueryKeys } from '@/enums/queryKeys'
import { selectMusicbrainzExternalEnabled } from '@/utils/redux/selectors/settingsSelectors'

/**
 * The MusicBrainz id for an artist, from the library if the server knows it
 * and from MusicBrainz by name if it doesn't.
 *
 * Only Jellyfin and Emby carry `ProviderIds.MusicBrainz` through to the
 * library, so on Navidrome — and every other Subsonic server — every artist
 * has a null mbid. Anything keyed by MBID therefore never rendered at all
 * there: the ListenBrainz shelf on Home was permanently empty for most of the
 * app's users, which looked like a broken feature rather than a missing one.
 *
 * One search per artist, cached for a day: an artist's MBID does not change,
 * and MusicBrainz asks callers not to hammer it. A name that matches nothing
 * resolves to null and the caller hides itself, same as before.
 *
 * The lookup is a request to MusicBrainz, so it is gated on the MusicBrainz
 * setting — with that off, only an MBID the server already carries is used
 * and no name ever leaves the device. Callers that need a lookup for their
 * own feature therefore hide themselves when MusicBrainz is off, which is the
 * intended reading of "external data only when asked for".
 */
export function useArtistMbid(
  artistName: string | null,
  localMbid?: string | null,
  options: { enabled?: boolean } = {}
): { mbid: string | null; isResolving: boolean } {
  const lookupAllowed = useSelector(selectMusicbrainzExternalEnabled)
  const trimmed = artistName?.trim() ?? ''
  const known = localMbid?.trim() || null
  const shouldLookUp =
    lookupAllowed && (options.enabled ?? true) && !known && trimmed.length > 0

  const query = useQuery<string | null>({
    queryKey: [QueryKeys.ArtistMbid, trimmed.toLowerCase()],
    queryFn: async () => {
      const [match] = await searchArtist(trimmed, 1)
      return match?.id ?? null
    },
    enabled: shouldLookUp,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    // A failed lookup is not worth retrying on a shelf nobody asked for.
    retry: false,
    networkMode: 'online',
  })

  if (known) return { mbid: known, isResolving: false }
  return {
    mbid: query.data ?? null,
    isResolving: shouldLookUp && query.isLoading,
  }
}
