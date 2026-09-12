import { useSelector } from 'react-redux'
import { useIsOffline } from '@/hooks/useIsOffline'
import { selectSearchSourceEnabled } from '@/utils/redux/selectors/settingsSelectors'
import { ALL_SOURCES, type SourceId } from '@/features/sources/registry'

/**
 * Which sources the user has turned on for Search's "Other sources" scope —
 * state entirely separate from Home/discovery enablement
 * (`useDeezerDiscoveryEnabled`, `musicbrainzExternalEnabled`, etc). A source
 * lighting up a Home shelf says nothing about whether Search may call it;
 * each surface's enablement is its own on/off switch.
 *
 * Mirrors `useDeezerSearchEnabled`'s offline gating: a source enabled in
 * settings still isn't attempted while the device has no network at all.
 *
 * Hooks are called unconditionally, one per known source id — `ALL_SOURCES`
 * is a fixed module constant, so this is a fixed call count across renders,
 * not a loop over changing data.
 */
export function useEnabledSearchSourceIds(): SourceId[] {
  const deezerEnabled = useSelector(selectSearchSourceEnabled('deezer'))
  const musicbrainzEnabled = useSelector(selectSearchSourceEnabled('musicbrainz'))
  const isOffline = useIsOffline()
  if (isOffline) return []
  return ALL_SOURCES
    .filter(source => (source.id === 'deezer' ? deezerEnabled : musicbrainzEnabled))
    .map(source => source.id)
}

export function useSearchSourceEnabled(sourceId: SourceId): boolean {
  const enabled = useSelector(selectSearchSourceEnabled(sourceId))
  const isOffline = useIsOffline()
  return enabled && !isOffline
}
