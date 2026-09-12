/**
 * The `IntegrationModule` capability-slot contract.
 *
 * See `docs/design-library-intent.md` §4 ("Capability slots — the integration
 * architecture") and §7 ("Auth model") — commit `5330f4ee` is the version this
 * file was written against; the doc has since been superseded by the settled
 * redesign decisions, but the slot list and module shape below match what §4
 * and §7 specified.
 *
 * This file defines the contract ONLY. It does not migrate any existing
 * registry: `src/features/downloaders/registry.ts` (`DownloaderDefinition`)
 * and `src/features/sources/registry.ts` (`SourceDefinition`) still stand on
 * their own and are converged onto this shape in later tasks (Phase B,
 * task groups B2/B3 of the library-intent implementation plan).
 *
 * Three layers stay conceptually separate (§4):
 * 1. Connection — can yuzic talk to the service? (`AuthDescriptor`, `testConnection`)
 * 2. Capability — what can that connected service do? (`slots`)
 * 3. Feature — what does the user want yuzic to do with it? (owned by callers,
 *    not by this file — see the "feature composition policies" table in §4)
 */

/**
 * Every capability a provider can fill, and (from §4) who is expected to fill
 * it today. Consumers ask the slot ("who fills `acquisition.track`?"), never
 * the provider by name — that indirection is the whole point of the contract.
 */
export type CapabilitySlot =
  /** Fetch and add a single track. Filled by slskd, SoulSync (not Lidarr — album-only). */
  | 'acquisition.track'
  /** Fetch and add a whole album/release. Filled by Lidarr, slskd. */
  | 'acquisition.album'
  /** Ongoing artist monitoring for future releases. Filled by Lidarr; deferred (§5.4). */
  | 'acquisition.monitor'
  /** Id/metadata refinement at acquisition time. Filled by MusicBrainz. */
  | 'resolution'
  /** Track-to-track similarity. Filled by a server adapter (e.g. getSimilarSongs2), AudioMuse. */
  | 'similarity.songs'
  /** Artist-to-artist similarity. Filled by a server adapter, Last.fm, ListenBrainz, Deezer. */
  | 'similarity.artists'
  /** A Home-shelf worth of discovery content. Filled by Deezer, ListenBrainz createdfor mixes, a server adapter. */
  | 'discovery.shelf'
  /** Seeds in, provider builds a server-side playlist (§11.1). Filled by AudioMuse. */
  | 'playlist.generate'
  /** Song lyrics, synced or plain. Filled by a server adapter today; LRCLIB at launch (§10). */
  | 'lyrics'
  /** Reports a listen to a destination. Filled by a server adapter, ListenBrainz; Last.fm-direct sequenced (§7.3). */
  | 'scrobble'
  /** Display-only artist info / artwork gap-filling, never writes server tags (§9). */
  | 'metadata.enrich'
  /** Short audio previews. Filled by Deezer (30s samples). */
  | 'preview'

/**
 * Authentication tiers a module can declare (§7). The settings UI and the
 * data-flow statement on the Connections screen are generated from this,
 * rather than hand-maintained per provider.
 */
export type AuthTier =
  /** Anonymous public API — still leaks query contents (§7 rule 1). */
  | 'none'
  /** Server-issued key/token the user supplies. */
  | 'apiKey'
  /** Signed per-user session (e.g. authenticated Last.fm scrobbling). */
  | 'account'

/**
 * What a module needs to authenticate, kept intentionally minimal: just the
 * tier plus an optional hint of which config keys a `'apiKey'`/`'account'`
 * module expects (e.g. `['serverUrl', 'apiKey']`). This is a hint for
 * settings-UI generation, not a full JSON-schema validator — expand it only
 * when a concrete consumer needs more than a key list.
 */
export type AuthDescriptor = {
  tier: AuthTier
  /** Config keys this module reads for auth, e.g. ['serverUrl', 'apiKey']. Omit for `'none'`. */
  configKeys?: string[]
}

/**
 * Result of `testConnection`. Mirrors the shape `AuthApi.ping`/`testUrl`
 * already use in `src/api/types.ts` (`{ success, message? }`), renamed to
 * `ok`/`message` since this is a general connection-health result, not
 * specifically about auth.
 */
export type Health = {
  ok: boolean
  message?: string
}

/**
 * Base type for what a module puts behind a `CapabilitySlot`.
 *
 * Deliberately loose: typing every slot's exact method signature here would
 * couple this contract-only task to every provider that will eventually fill
 * a slot (acquisition, similarity, lyrics, scrobble, ...), most of which
 * don't exist as modules yet. Each slot gets its own refined `SlotImpl`
 * subtype — e.g. an `AcquisitionTrackImpl` with a `downloadTrack` method —
 * when that slot is actually implemented (Phase B task groups B2 onward).
 * Until then, callers narrow with `unknown` rather than `any`.
 *
 * TODO(Phase B/E, per slot): replace `unknown` values with concrete per-slot
 * method signatures as each slot gains a real implementation.
 */
export type SlotImpl = unknown

/** One knob a module's `OptionsDescriptor` can render for the user. */
export type OptionsField = {
  key: string
  label: string
  type: 'select' | 'toggle' | 'text' | 'number'
  /** Only meaningful for `type: 'select'`. */
  choices?: { value: string; label: string }[]
  /** Value the field starts at when the user hasn't set one. */
  defaultValue?: string | number | boolean
}

/**
 * Schema-driven per-provider options (§4/§6), e.g. slskd's search
 * preferences or a Lidarr quality-profile pick. Kept minimal — a flat field
 * list is enough to drive a settings form; it is not a form renderer and
 * does not (yet) express conditional/nested fields.
 */
export type OptionsDescriptor = {
  fields: OptionsField[]
}

/**
 * The contract every provider converges on (§4 "Module contract"). Existing
 * registries (`DownloaderDefinition`, `SourceDefinition`) are adapted to this
 * shape in later tasks — this file does not migrate them.
 *
 * `slots` is `Partial` because a module fills whichever capabilities it
 * actually supports (mirrors the presence-check pattern `ApiAdapter` already
 * uses in `src/api/types.ts` for optional capability fields).
 */
export type IntegrationModule = {
  id: string
  /** Display name shown to users (not translated — product names, matches DownloaderDefinition's convention). */
  label: string
  auth: AuthDescriptor
  slots: Partial<Record<CapabilitySlot, SlotImpl>>
  options?: OptionsDescriptor
  testConnection(config: unknown): Promise<Health>
}

/** Summary of a module's declared capabilities, for the Connections screen and slot lookups. */
export type ModuleDescription = {
  id: string
  label: string
  slots: CapabilitySlot[]
  authTier: AuthTier
}

/**
 * Pure summary of which slots a module fills and how it authenticates. This
 * is what a future Connections screen (§4) and "who fills slot X" lookups
 * (the Get router, a Home shelf asking for `similarity.songs`, etc.) build on.
 */
export function describeModule(module: IntegrationModule): ModuleDescription {
  return {
    id: module.id,
    label: module.label,
    slots: (Object.keys(module.slots) as CapabilitySlot[]).filter(
      (slot) => module.slots[slot] !== undefined
    ),
    authTier: module.auth.tier,
  }
}

/** Whether `module` declares an implementation for `slot`. */
export function moduleFillsSlot(module: IntegrationModule, slot: CapabilitySlot): boolean {
  return module.slots[slot] !== undefined
}
