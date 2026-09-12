/**
 * Read-only capability registry: "who fills CapabilitySlot X right now?"
 *
 * This is an additive aggregation layer over two things that already exist
 * independently and stay independent:
 *   1. The active server adapter (`ApiAdapter`, obtained via `useApi()` —
 *      see `src/api/index.ts`). Every install has exactly one active music
 *      server, and it is required core, not an optional integration — so it
 *      deliberately does NOT become an `IntegrationModule`. Instead its
 *      capabilities are surfaced into the same `CapabilitySlot` vocabulary
 *      (`serverAdapterSlots`) so callers can ask about it uniformly.
 *   2. Connected/enabled `IntegrationModule`s (downloaders, sources) via
 *      their existing registries (`useDownloaderStates`,
 *      `useEnabledExternalSources`).
 *
 * This layer only reports availability — it never calls a provider itself.
 * Deciding how to blend/select/fall back between multiple providers that
 * fill the same slot (e.g. AudioMuse vs. the server's native similarity) is
 * a feature-level decision, owned by the caller — see
 * `docs/design-library-intent.md` §4 "feature composition policies". A
 * concrete example of that composition already exists in
 * `src/contexts/queueProviders.ts` (`resolveQueueFillProvider`), written
 * before this registry existed; it is not migrated onto it here.
 */
import { useMemo } from 'react'
import type { ApiAdapter } from '@/api/types'
import { useApi } from '@/api'
import { useSelector } from 'react-redux'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import { SERVER_PROVIDERS } from '@/utils/servers/registry'
import type { CapabilitySlot } from '@/features/integrations/types'
import { moduleFillsSlot } from '@/features/integrations/types'
import { useDownloaderStates } from '@/features/downloaders/registry'
import { useEnabledExternalSources } from '@/features/sources/registry'

/**
 * Which `CapabilitySlot`s a given `ApiAdapter` fills, per the mapping:
 *   - `similar.getSimilarSongs` (always present on a valid adapter) -> `similarity.songs`
 *   - `similar.getSimilarArtists` (optional) -> `similarity.artists`
 *   - `lyrics` (always present) -> `lyrics`
 *   - `songs.scrobble` (always present) -> `scrobble`
 *   - `discovery` (optional) -> `discovery.shelf`
 *
 * Pure and side-effect-free: presence-checks only, no network calls.
 */
export function serverAdapterSlots(adapter: ApiAdapter): CapabilitySlot[] {
  const slots: CapabilitySlot[] = []

  if (typeof adapter.similar?.getSimilarSongs === 'function') {
    slots.push('similarity.songs')
  }
  if (typeof adapter.similar?.getSimilarArtists === 'function') {
    slots.push('similarity.artists')
  }
  if (adapter.lyrics && typeof adapter.lyrics.getBySongId === 'function') {
    slots.push('lyrics')
  }
  if (adapter.songs && typeof adapter.songs.scrobble === 'function') {
    slots.push('scrobble')
  }
  if (adapter.discovery) {
    slots.push('discovery.shelf')
  }

  return slots
}

/** One provider that fills a slot: either the active server adapter, or a connected `IntegrationModule`. */
export type SlotProvider = {
  source: 'server' | 'module'
  id: string
  label: string
}

/**
 * Everyone currently available to fill `slot`: the active server adapter
 * (if its `ApiAdapter` implements it) plus every connected/enabled
 * `IntegrationModule` that declares it — downloaders filtered to
 * `isConnected`, external sources filtered to their enabled-setting.
 *
 * Read-only: this does not call any provider, it only reports availability.
 * Memoized so callers may safely use the result as an effect dependency.
 */
export function useSlotProviders(slot: CapabilitySlot): SlotProvider[] {
  const api = useApi()
  const activeServer = useSelector(selectActiveServer)
  const downloaderStates = useDownloaderStates()
  const enabledSources = useEnabledExternalSources()

  return useMemo(() => {
    const providers: SlotProvider[] = []

    if (activeServer && serverAdapterSlots(api).includes(slot)) {
      providers.push({
        source: 'server',
        id: activeServer.id,
        label: SERVER_PROVIDERS[activeServer.type]?.label ?? activeServer.type,
      })
    }

    for (const { def, isConnected } of downloaderStates) {
      if (isConnected && moduleFillsSlot(def, slot)) {
        providers.push({ source: 'module', id: def.id, label: def.label })
      }
    }

    for (const source of enabledSources) {
      if (moduleFillsSlot(source, slot)) {
        providers.push({ source: 'module', id: source.id, label: source.label })
      }
    }

    return providers
  }, [api, activeServer, downloaderStates, enabledSources, slot])
}

/** Whether anyone — server or module — currently fills `slot`. */
export function useSlotFilled(slot: CapabilitySlot): boolean {
  return useSlotProviders(slot).length > 0
}
