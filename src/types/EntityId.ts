/**
 * A stable, on-device identity for an artist/album/track.
 *
 * This is deliberately separate from *matching* (deciding two records
 * describe the same real-world work), which lives in `src/hooks/libraryMatch.ts`
 * and `src/utils/normalize.ts`. `LocalId` never derives from mutable display
 * metadata (title/artist/name) — only from stable origin ids — so it can be
 * computed synchronously, offline, and without ever agreeing that a
 * server-originated record and an external-originated record are "the same".
 */
export type LocalId = string & { readonly __brand: 'LocalId' };

/** The kind of entity a `LocalId` identifies. */
export type EntityKind = 'artist' | 'album' | 'track';

/** A `LocalId` derived from an item's id on a connected server/local provider. */
export interface ServerLocalIdInput {
  kind: EntityKind;
  /** Id of the server (or local provider) the item lives on, e.g. `Server.id`. */
  sourceServerId: string;
  /** The item's own id as reported by that server. */
  serverItemId: string;
}

/** A `LocalId` derived from an external source's native id for the item. */
export interface ExternalLocalIdInput {
  kind: EntityKind;
  /** Name of the external source, e.g. `'deezer'` or `'musicbrainz'`. */
  externalSource: string;
  /** The item's native id as reported by that external source. */
  externalNativeId: string;
}

/**
 * Discriminated by which fields are present: `sourceServerId`/`serverItemId`
 * for a server-originated entity, or `externalSource`/`externalNativeId` for
 * an external-originated one.
 */
export type LocalIdInput = ServerLocalIdInput | ExternalLocalIdInput;

function isServerLocalIdInput(input: LocalIdInput): input is ServerLocalIdInput {
  return 'sourceServerId' in input;
}

/**
 * Builds a stable, deterministic `LocalId` from data already available on
 * device — no network call, no crypto/hashing. The same input always
 * produces the same id; a different `kind`, `sourceServerId`, or
 * `externalSource` always produces a different id. The scheme is a
 * readable, namespaced string:
 *   - server-originated: `local:{kind}:srv:{sourceServerId}:{serverItemId}`
 *   - external-originated: `local:{kind}:ext:{externalSource}:{externalNativeId}`
 */
export function makeLocalId(input: LocalIdInput): LocalId {
  if (isServerLocalIdInput(input)) {
    return `local:${input.kind}:srv:${input.sourceServerId}:${input.serverItemId}` as LocalId;
  }
  return `local:${input.kind}:ext:${input.externalSource}:${input.externalNativeId}` as LocalId;
}
