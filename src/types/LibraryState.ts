/**
 * The resolution state of an entity (artist/album/track) with respect to the
 * user's library and the sources currently enabled:
 * - `in-library`: the entity exists on the active server or the local
 *   provider — it is something the user already owns/has.
 * - `wanted`: the user has declared save-only intent for the entity, but it
 *   is not yet present on any owned server or local provider.
 * - `acquirable`: the entity is not owned, but an enabled acquisition
 *   provider could get it (e.g. a downloader/importer that can bring it in).
 * - `external`: the entity is only known via an enabled external source
 *   (e.g. Deezer/MusicBrainz) — preview/browse only, with no path to
 *   acquisition currently enabled.
 */
export type LibraryState = 'in-library' | 'wanted' | 'acquirable' | 'external';
