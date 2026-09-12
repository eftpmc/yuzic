import { ExternalAlbumBase, ExternalCatalogSource, ExternalIds } from "./Album";
import { CoverSource } from "./Cover";
import { ExternalSong } from "./Song";
import { LibraryState } from "./LibraryState";
import { LocalId } from "./EntityId";

export interface Artist {
    id: string;
    cover: CoverSource;
    name: string;
    subtext: string;
    /** MusicBrainz ID when available from server (Navidrome, Jellyfin) */
    mbid?: string | null;
    albumIds: string[];
    /** Stable on-device identity — see {@link LocalId}. Additive/optional during migration. */
    localId?: LocalId;
    /** Additive external ids (mbid/deezerId/…). Optional during migration. */
    externalIds?: ExternalIds;
    /** Resolution state — see {@link LibraryState}. Absent → treated as 'in-library'. */
    libraryState?: LibraryState;
}

export interface ExternalArtistBase {
    id: string;
    name: string;
    cover: CoverSource;
    subtext: string;
    biography?: string;
    externalSource?: ExternalCatalogSource;
    externalIds?: ExternalIds;
    /** Stable on-device identity — see {@link LocalId}. Additive/optional during migration. */
    localId?: LocalId;
    /** Resolution state — external entities are 'external'. Additive/optional during migration. */
    libraryState?: LibraryState;
}

export interface ExternalArtist extends ExternalArtistBase {
    topTracks?: ExternalSong[];
    albums: ExternalAlbumBase[];
    singles: ExternalAlbumBase[];
    similarArtists: ExternalArtistBase[];
}
