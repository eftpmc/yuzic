import { ExternalAlbumBase, ExternalCatalogSource, ExternalIds } from "./Album";
import { CoverSource } from "./Cover";
import { ExternalSong } from "./Song";

export interface Artist {
    id: string;
    cover: CoverSource;
    name: string;
    subtext: string;
    /** MusicBrainz ID when available from server (Navidrome, Jellyfin) */
    mbid?: string | null;
    albumIds: string[];
}

export interface ExternalArtistBase {
    id: string;
    name: string;
    cover: CoverSource;
    subtext: string;
    biography?: string;
    externalSource?: ExternalCatalogSource;
    externalIds?: ExternalIds;
}

export interface ExternalArtist extends ExternalArtistBase {
    topTracks?: ExternalSong[];
    albums: ExternalAlbumBase[];
    singles: ExternalAlbumBase[];
    similarArtists: ExternalArtistBase[];
}
