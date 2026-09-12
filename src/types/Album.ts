import { CoverSource } from "./Cover";
import { ExternalSong, Song } from "./Song";
import { LibraryState } from "./LibraryState";
import { LocalId } from "./EntityId";

export type ExternalCatalogSource = 'deezer' | 'musicbrainz' | 'lastfm';

export interface ExternalIds {
    deezerId?: string;
    artistDeezerId?: string;
    mbid?: string | null;
    artistMbid?: string | null;
    upc?: string | null;
    isrc?: string | null;
}

/**
 * A reference to an artist as embedded on an album/track. Carries enough to
 * render and navigate without a separate fetch. `localId`/`externalIds` are
 * additive (populated during the entity-model migration) and optional so
 * existing construction sites stay valid.
 */
export interface ArtistRef {
    id: string;
    name: string;
    cover: CoverSource;
    subtext: string;
    mbid?: string | null;
    /** Stable on-device identity — see {@link LocalId}. Additive/optional during migration. */
    localId?: LocalId;
    externalIds?: ExternalIds;
}

export interface AlbumBase {
    id: string;
    title: string;
    cover: CoverSource;
    subtext: string;
    artist: ArtistRef;
    year: number;
    genres: string[];
    created: Date;
    /** MusicBrainz ID (release or release-group) when available from server */
    mbid?: string | null;
    /** Server-reported play count — populated during sync, used to seed local stats */
    serverPlayCount?: number;
    /** Server-reported last played timestamp (unix ms) — populated during sync */
    serverLastPlayedAt?: number;
    /** Stable on-device identity — see {@link LocalId}. Additive/optional during migration. */
    localId?: LocalId;
    /** Additive external ids (mbid/deezerId/…). Optional during migration. */
    externalIds?: ExternalIds;
    /** Resolution state — see {@link LibraryState}. Absent → treated as 'in-library'. */
    libraryState?: LibraryState;
}

export interface Album extends AlbumBase {
    songs: Song[];
}

export interface ExternalAlbumBase {
    id: string;
    title: string;
    cover: CoverSource;
    artist: string;
    artistMbid?: string | null;
    subtext: string;
    releaseDate?: string
    releaseType?: 'album' | 'single'
    externalSource?: ExternalCatalogSource;
    externalIds?: ExternalIds;
    /** Stable on-device identity — see {@link LocalId}. Additive/optional during migration. */
    localId?: LocalId;
    /** Resolution state — external entities are 'external'. Additive/optional during migration. */
    libraryState?: LibraryState;
}

export interface ExternalAlbum extends ExternalAlbumBase {
    songs: ExternalSong[];
}
